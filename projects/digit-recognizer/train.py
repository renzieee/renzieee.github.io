"""
Handwritten Digit Recognizer - training script
Author: Renzie Gacot

Trains a small neural network (multi-layer perceptron) on the scikit-learn
"digits" dataset (1,797 handwritten digits, 8x8 pixels, values 0-16),
evaluates it, and exports the weights to model.json so the model can run
in the browser with plain JavaScript (see app.js).

Run:  python train.py
Needs: numpy, scikit-learn, matplotlib
"""
import json
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from sklearn.datasets import load_digits
from sklearn.model_selection import train_test_split
from sklearn.neural_network import MLPClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, classification_report

RANDOM_STATE = 42

# 1. Load the data -------------------------------------------------------------
digits = load_digits()
X = digits.data / 16.0          # scale pixel values from 0-16 to 0-1
y = digits.target
print(f"Dataset: {X.shape[0]} images, {X.shape[1]} pixels each")

# 2. Hold back 20% of the images for testing ----------------------------------
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=RANDOM_STATE, stratify=y)

# 3. Data augmentation ----------------------------------------------------------
# People draw digits slightly off-centre, so I add copies of each training
# image shifted one pixel up/down/left/right. This makes the model more
# forgiving when someone draws in the browser.
def shift(images, dx, dy):
    imgs = images.reshape(-1, 8, 8)
    out = np.zeros_like(imgs)
    src_y = slice(max(0, -dy), 8 - max(0, dy))
    dst_y = slice(max(0, dy), 8 - max(0, -dy))
    src_x = slice(max(0, -dx), 8 - max(0, dx))
    dst_x = slice(max(0, dx), 8 - max(0, -dx))
    out[:, dst_y, dst_x] = imgs[:, src_y, src_x]
    return out.reshape(-1, 64)

X_aug = [X_train] + [shift(X_train, dx, dy) for dx, dy in [(1,0),(-1,0),(0,1),(0,-1)]]
X_train_aug = np.vstack(X_aug)
y_train_aug = np.tile(y_train, len(X_aug))
print(f"Training images after augmentation: {len(X_train_aug)}")

# 4. Train the neural network ---------------------------------------------------
model = MLPClassifier(hidden_layer_sizes=(64,), activation="relu",
                      alpha=1e-3, max_iter=400, random_state=RANDOM_STATE)
model.fit(X_train_aug, y_train_aug)

# 5. Evaluate on images the model has never seen --------------------------------
pred = model.predict(X_test)
acc = accuracy_score(y_test, pred)
print(f"\nTest accuracy: {acc:.2%}\n")
print(classification_report(y_test, pred, digits=3))

# 6. Charts for the README / website -------------------------------------------
plt.rcParams.update({"font.size": 10, "axes.edgecolor": "#888"})
cm = confusion_matrix(y_test, pred)
fig, ax = plt.subplots(figsize=(5.2, 4.6), dpi=150)
im = ax.imshow(cm, cmap="Blues")
ax.set_xticks(range(10)); ax.set_yticks(range(10))
ax.set_xlabel("Predicted digit"); ax.set_ylabel("Actual digit")
ax.set_title(f"Confusion matrix (test accuracy {acc:.1%})")
for i in range(10):
    for j in range(10):
        if cm[i, j]:
            ax.text(j, i, cm[i, j], ha="center", va="center",
                    color="white" if cm[i, j] > cm.max() / 2 else "#333", fontsize=8)
fig.tight_layout(); fig.savefig("confusion_matrix.png"); plt.close(fig)

fig, axes = plt.subplots(2, 8, figsize=(8, 2.6), dpi=150)
for ax, img, p, t in zip(axes.ravel(), X_test, pred, y_test):
    ax.imshow(img.reshape(8, 8), cmap="gray_r")
    ax.set_title(f"pred {p}", color="#1a7f37" if p == t else "#cf222e", fontsize=9)
    ax.axis("off")
fig.suptitle("Sample test predictions (green = correct)", fontsize=10)
fig.tight_layout(); fig.savefig("sample_predictions.png"); plt.close(fig)

# 7. Export weights so JavaScript can run the same model -----------------------
r = lambda a: np.round(a, 5).tolist()
with open("model.json", "w") as f:
    json.dump({
        "info": "MLP 64 -> 64 (ReLU) -> 10 (softmax), trained on sklearn digits",
        "test_accuracy": round(float(acc), 4),
        "W1": r(model.coefs_[0]), "b1": r(model.intercepts_[0]),
        "W2": r(model.coefs_[1]), "b2": r(model.intercepts_[1]),
    }, f)

# Save a few test images + Python's answers to check the JS version matches
with open("test_samples.json", "w") as f:
    json.dump({"X": r(X_test[:50]), "pred": pred[:50].tolist()}, f)

print("Saved model.json, confusion_matrix.png, sample_predictions.png")
