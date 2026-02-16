import os
import cv2
import torch
import numpy as np
from torch import nn
from torch.utils.data import Dataset, DataLoader

# Dimensions (Keep these consistent with your training)
IMG_SIZE_W = 800
IMG_SIZE_H = 600


# -------------------------
# DATASET
# -------------------------
class MapDataset(Dataset):
    def __init__(self, root):
        # Updated to join paths correctly for your OS
        self.img_dir = os.path.join(root, "Image")
        self.mask_dir = os.path.join(root, "Mask")

        # Safety check to ensure directories exist
        if not os.path.exists(self.img_dir):
            print(f"Error: Could not find Image directory at {self.img_dir}")

        self.files = [
            f for f in os.listdir(self.img_dir)
            if os.path.exists(
                os.path.join(self.mask_dir, os.path.splitext(f)[0] + ".png")
            )
        ]

    def __len__(self):
        return len(self.files)

    def __getitem__(self, i):
        name = self.files[i]
        base = os.path.splitext(name)[0]

        img_path = os.path.join(self.img_dir, name)
        mask_path = os.path.join(self.mask_dir, base + ".png")

        img = cv2.imread(img_path)
        mask = cv2.imread(mask_path, cv2.IMREAD_GRAYSCALE)

        if img is None:
            raise ValueError(f"Failed to load image: {img_path}")
        if mask is None:
            raise ValueError(f"Failed to load mask: {mask_path}")

        img = cv2.resize(img, (IMG_SIZE_W, IMG_SIZE_H))
        mask = cv2.resize(mask, (IMG_SIZE_W, IMG_SIZE_H))

        img = img.astype(np.float32) / 255.0
        mask = mask.astype(np.float32) / 255.0

        mask = (mask > 0.5).astype(np.float32)

        img = torch.from_numpy(img.transpose(2, 0, 1))
        mask = torch.from_numpy(mask).unsqueeze(0)

        return img, mask


# -------------------------
# MODEL
# -------------------------
def block(i, o):
    return nn.Sequential(
        nn.Conv2d(i, o, 3, padding=1),
        nn.ReLU(),
        nn.Conv2d(o, o, 3, padding=1),
        nn.ReLU()
    )


class UNet(nn.Module):
    def __init__(self):
        super().__init__()
        self.d1 = block(3, 64)
        self.d2 = block(64, 128)
        self.d3 = block(128, 256)

        self.pool = nn.MaxPool2d(2)

        self.u1 = block(256 + 128, 128)
        self.u2 = block(128 + 64, 64)

        self.up = nn.Upsample(scale_factor=2)
        self.out = nn.Conv2d(64, 1, 1)

    def forward(self, x):
        d1 = self.d1(x)
        d2 = self.d2(self.pool(d1))
        d3 = self.d3(self.pool(d2))

        x = self.up(d3)
        x = torch.cat([x, d2], 1)
        x = self.u1(x)

        x = self.up(x)
        x = torch.cat([x, d1], 1)
        x = self.u2(x)

        return torch.sigmoid(self.out(x))


# -------------------------
# TRAINING (Commented Out)
# -------------------------
# To train, uncomment below. Note the path is "../data"
# if __name__ == "__main__":
#     dataset = MapDataset("../data")  # <--- UPDATED PATH
#     loader = DataLoader(dataset, batch_size=2, shuffle=True)
#
#     model = UNet()
#     opt = torch.optim.Adam(model.parameters(), lr=1e-2)
#     loss_fn = nn.BCELoss()
#
#     print("Starting training...")
#     for epoch in range(10):
#         for img, mask in loader:
#             pred = model(img)
#             loss = loss_fn(pred, mask)
#
#             opt.zero_grad()
#             loss.backward()
#             opt.step()
#
#         print("epoch", epoch, "loss", float(loss))
#         torch.save(model.state_dict(), f"net_{epoch}.pth")
#
#     torch.save(model.state_dict(), "unet.pth")
#     print("Training complete")


# -------------------------
# TESTING / INFERENCE
# # -------------------------
# if __name__ == "__main__":
#     # 1. Initialize Model
#     model = UNet()
#
#     # 2. Load Weights (Ensure unet.pth is in the backend folder)
#     if os.path.exists("unet.pth"):
#         model.load_state_dict(torch.load("unet.pth"))
#         print("Model loaded successfully.")
#     else:
#         print("Error: 'unet.pth' not found. Please train the model or place the file in the backend folder.")
#         exit()
#
#     model.eval()
#
#     # 3. Load Test Image (Path updated to go UP one level to data folder)
#     test_img_path = "../data/test.jpg"  # <--- UPDATED PATH
#
#     img = cv2.imread(test_img_path)
#
#     if img is None:
#         print(f"Error: Could not read image at {test_img_path}")
#         print("Check if the file exists and the path is correct.")
#     else:
#         # Preprocess
#         img_resized = cv2.resize(img, (IMG_SIZE_W, IMG_SIZE_H))
#         t = torch.from_numpy(img_resized.astype(np.float32) / 255.0).permute(2, 0, 1).unsqueeze(0)
#
#         # Predict
#         with torch.no_grad():
#             pred = model(t)[0, 0].numpy()
#
#         # Post-process & Save
#         mask = (pred > 0.5).astype(np.uint8) * 255
#         cv2.imwrite("pred_mask.png", mask)
#         print("Prediction saved to 'backend/pred_mask.png'")