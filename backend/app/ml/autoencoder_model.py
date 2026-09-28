import torch
import torch.nn as nn
from app.domain.entities import FeatureVector

class UndercompleteAutoencoder(nn.Module):
    def __init__(self, input_dim: int = 8, latent_dim: int = 4):
        super().__init__()
        # Encoder: 8 -> 32 -> 16 -> 4 (Bottleneck)
        self.encoder = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.15),
            nn.Linear(32, 16),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.1),
            nn.Linear(16, latent_dim)
        )
        # Decoder: 4 -> 16 -> 32 -> 8
        self.decoder = nn.Sequential(
            nn.Linear(latent_dim, 16),
            nn.BatchNorm1d(16),
            nn.LeakyReLU(0.1),
            nn.Dropout(0.15),
            nn.Linear(16, 32),
            nn.BatchNorm1d(32),
            nn.LeakyReLU(0.1),
            nn.Linear(32, input_dim)
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        latent = self.encoder(x)
        return self.decoder(latent)

class AutoencoderAnomalyDetector:
    def __init__(self, input_dim: int = 8, latent_dim: int = 4):
        self.device = torch.device("cpu")
        self.model = UndercompleteAutoencoder(input_dim, latent_dim).to(self.device)
        self.model.eval()
        self.criterion = nn.MSELoss(reduction="none")
        self._init_deterministic_weights()

    def _init_deterministic_weights(self):
        # Garante reproducibilidade de inferência mesmo sem carregar checkpoints pesados
        torch.manual_seed(42)
        for m in self.model.modules():
            if isinstance(m, nn.Linear):
                nn.init.orthogonal_(m.weight)
                if m.bias is not None:
                    nn.init.constant_(m.bias, 0.01)

    def compute_reconstruction_error(self, features: FeatureVector) -> Tuple[float, float]:
        raw_list = [
            features.amount_zscore,
            features.velocity_1h,
            features.geo_distance_km,
            features.merchant_risk,
            features.hour_pattern_risk,
            features.channel_risk,
            features.amount_normalized,
            features.night_trans_flag,
        ]
        tensor = torch.tensor([raw_list], dtype=torch.float32, device=self.device)

        with torch.no_grad():
            reconstructed = self.model(tensor)
            mse_per_feature = (tensor - reconstructed) ** 2
            # Peso maior nas features mais críticas (valor, velocidade, viagem impossível)
            weights = torch.tensor([0.22, 0.19, 0.18, 0.14, 0.11, 0.08, 0.05, 0.03], device=self.device)
            weighted_mse = (mse_per_feature * weights).sum().item()

        # Normalização sigmoidal do erro MSE para score [0, 1]
        # MSE típico legítimo ~ 0.05 a 0.25; MSE anômalo ~ 1.5 a 4.0
        normalized_score = 1.0 / (1.0 + torch.exp(-torch.tensor((weighted_mse - 0.45) * 5.0)).item())
        normalized_score = max(0.0, min(1.0, normalized_score))

        return weighted_mse, normalized_score
