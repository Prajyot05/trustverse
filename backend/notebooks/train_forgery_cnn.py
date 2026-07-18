import torch
import torch.nn as nn
import torch.optim as optim
from torchvision import transforms, datasets
from torch.utils.data import DataLoader
import os

# Define the CNN Architecture
class DocumentForgeryCNN(nn.Module):
    def __init__(self):
        super(DocumentForgeryCNN, self).__init__()
        # ELA images are typically 3 channels
        self.conv_layers = nn.Sequential(
            nn.Conv2d(3, 32, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2),
            
            nn.Conv2d(64, 128, kernel_size=3, padding=1),
            nn.ReLU(),
            nn.MaxPool2d(2)
        )
        
        self.fc_layers = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 28 * 28, 512), # Assuming input is 224x224
            nn.ReLU(),
            nn.Dropout(0.5),
            nn.Linear(512, 1),
            nn.Sigmoid() # Binary classification: Authentic (1) vs Forged (0)
        )

    def forward(self, x):
        x = self.conv_layers(x)
        x = self.fc_layers(x)
        return x

def train_model(data_dir, epochs=10, batch_size=32):
    # Data Augmentation & Normalization
    transform = transforms.Compose([
        transforms.Resize((224, 224)),
        transforms.ToTensor(),
        transforms.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225])
    ])

    print("Loading dataset...")
    # Dataset should be structured as data_dir/authentic/ and data_dir/forged/
    dataset = datasets.ImageFolder(data_dir, transform=transform)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    print(f"Using device: {device}")

    model = DocumentForgeryCNN().to(device)
    criterion = nn.BCELoss()
    optimizer = optim.Adam(model.parameters(), lr=0.001)

    print("Starting training...")
    for epoch in range(epochs):
        model.train()
        running_loss = 0.0
        
        for inputs, labels in dataloader:
            inputs, labels = inputs.to(device), labels.to(device).float().unsqueeze(1)
            
            optimizer.zero_grad()
            outputs = model(inputs)
            loss = criterion(outputs, labels)
            loss.backward()
            optimizer.step()
            
            running_loss += loss.item()
            
        print(f"Epoch {epoch+1}/{epochs} - Loss: {running_loss/len(dataloader):.4f}")

    # Save the model state dict
    os.makedirs('models', exist_ok=True)
    torch.save(model.state_dict(), 'models/document_forgery_cnn.pth')
    print("Model saved to models/document_forgery_cnn.pth")

if __name__ == "__main__":
    # Example usage:
    # Requires a dataset of pre-processed ELA images
    # train_model('path/to/ela_dataset', epochs=20)
    print("This script is intended to be run with a dataset of ELA (Error Level Analysis) images.")
    print("Dataset structure:")
    print("  dataset/")
    print("    authentic/  (Contains unmodified document scans)")
    print("    forged/     (Contains tampered/spliced document scans)")
