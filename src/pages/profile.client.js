const form = document.getElementById("profile-form");
const statusEl = document.getElementById("status");
const avatarInput = document.getElementById("avatar");
const avatarTrigger = document.getElementById("avatar-trigger");
const avatarImg = document.getElementById("avatar-img");
const avatarPlaceholder = document.getElementById("avatar-placeholder");
const tabInfo = document.getElementById("tab-info");
const tabSec = document.getElementById("tab-security");
const panelInfo = document.getElementById("panel-info");
const panelSec = document.getElementById("panel-security");

function setStatus(msg, kind = "info") {
  if (!statusEl) return;
  const colors = {
    info: "text-base-content/70",
    success: "text-success",
    error: "text-error",
    warning: "text-warning",
  };
  statusEl.className = `text-sm text-center flex-1 ${
    colors[kind] || colors.info
  }`;
  statusEl.textContent = msg || "";
}

if (avatarTrigger && avatarInput) {
  avatarTrigger.addEventListener("click", () => avatarInput.click());
  avatarInput.addEventListener("change", () => {
    const file = avatarInput.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setStatus("L'image ne doit pas dépasser 5 Mo", "error");
        avatarInput.value = "";
        return;
      }

      if (!file.type.startsWith("image/")) {
        setStatus("Veuillez sélectionner une image", "error");
        avatarInput.value = "";
        return;
      }

      const url = URL.createObjectURL(file);
      if (avatarImg) {
        avatarImg.src = url;
      } else if (avatarPlaceholder) {
        const img = document.createElement("img");
        img.id = "avatar-img";
        img.alt = "Avatar";
        img.className =
          "w-full h-full object-cover transition-transform duration-200 group-hover:scale-105";
        img.src = url;
        avatarPlaceholder.replaceWith(img);
      }
      setStatus("Image sélectionnée. N'oubliez pas d'enregistrer.", "info");
    }
  });
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    setStatus("Enregistrement en cours…", "info");

    const fd = new FormData(form);

    const pw = fd.get("password");
    const pwc = fd.get("passwordConfirm");
    const cur = fd.get("currentPassword");

    // Vérifier si c'est un changement de mot de passe
    const isPasswordChange = !!(pw || pwc || cur);

    if ((pw || pwc) && pw !== pwc) {
      setStatus("Les nouveaux mots de passe ne correspondent pas.", "error");
      return;
    }

    if ((pw || pwc) && !cur) {
      setStatus(
        "Veuillez saisir votre mot de passe actuel pour le modifier.",
        "error"
      );
      return;
    }

    if (pw && pw.length < 8) {
      setStatus(
        "Le nouveau mot de passe doit contenir au moins 8 caractères.",
        "error"
      );
      return;
    }

    try {
      const res = await fetch("/api/profile-update", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setStatus("Session expirée. Veuillez vous reconnecter.", "error");
          setTimeout(() => {
            window.location.href = "/login";
          }, 2000);
          return;
        } else if (res.status === 403) {
          setStatus(data.error || "Mot de passe actuel incorrect.", "error");
          return;
        } else if (res.status === 400) {
          setStatus(data.error || "Données invalides.", "error");
          return;
        }
        throw new Error(data.error || "Échec de la mise à jour");
      }

      if (data?.user) {
        try {
          localStorage.setItem("user", JSON.stringify(data.user));
        } catch (err) {
          console.warn("Impossible de sauvegarder dans localStorage:", err);
        }
      }

      // Si c'est un changement de mot de passe, rediriger vers login
      if (isPasswordChange && pw) {
        setStatus(
          "✓ Mot de passe modifié avec succès ! Redirection...",
          "success"
        );
        setTimeout(() => {
          window.location.href = "/login";
        }, 1500);
        return;
      }

      setStatus("✓ Profil mis à jour avec succès !", "success");

      // Mettre à jour l'affichage sans recharger la page
      if (data?.user) {
        // Mettre à jour les champs du formulaire avec les nouvelles valeurs
        const nameInput = form.querySelector('input[name="name"]');
        const emailInput = form.querySelector('input[name="email"]');

        if (nameInput && data.user.name) nameInput.value = data.user.name;
        if (emailInput && data.user.email) emailInput.value = data.user.email;

        // Mettre à jour l'avatar si changé
        if (data.user.avatar && avatarImg) {
          const PB_URL = "http://127.0.0.1:8090";
          const newAvatarUrl = `${PB_URL}/api/files/${data.user.collectionId}/${
            data.user.id
          }/${data.user.avatar}?thumb=160x160&t=${Date.now()}`;
          avatarImg.src = newAvatarUrl;
        }

        // Mettre à jour l'initiale dans le placeholder si pas d'avatar
        if (!data.user.avatar && avatarPlaceholder) {
          const initial = (
            data.user.name ||
            data.user.username ||
            data.user.email ||
            "U"
          )
            .slice(0, 1)
            .toUpperCase();
          avatarPlaceholder.textContent = initial;
        }

        // Déclencher un événement personnalisé pour mettre à jour le header
        window.dispatchEvent(
          new CustomEvent("profile-updated", { detail: { user: data.user } })
        );

        // Réinitialiser les champs de mot de passe
        const currentPasswordInput = form.querySelector(
          'input[name="currentPassword"]'
        );
        const passwordInput = form.querySelector('input[name="password"]');
        const passwordConfirmInput = form.querySelector(
          'input[name="passwordConfirm"]'
        );

        if (currentPasswordInput) currentPasswordInput.value = "";
        if (passwordInput) passwordInput.value = "";
        if (passwordConfirmInput) passwordConfirmInput.value = "";
      }

      // Réinitialiser l'input file
      if (avatarInput) {
        avatarInput.value = "";
      }
    } catch (err) {
      console.error("Erreur lors de la mise à jour:", err);
      setStatus(
        err.message || "Erreur lors de la mise à jour du profil.",
        "error"
      );
    }
  });

  form.addEventListener("reset", () => {
    setStatus("", "info");
    if (avatarInput) {
      avatarInput.value = "";
    }
  });
}

function activateTab(which) {
  if (!tabInfo || !tabSec || !panelInfo || !panelSec) return;

  setStatus("", "info");

  if (which === "security") {
    tabInfo.classList.remove("tab-active");
    tabSec.classList.add("tab-active");
    panelInfo.classList.add("hidden");
    panelSec.classList.remove("hidden");
  } else {
    tabSec.classList.remove("tab-active");
    tabInfo.classList.add("tab-active");
    panelSec.classList.add("hidden");
    panelInfo.classList.remove("hidden");
  }
}

if (tabInfo && tabSec) {
  tabInfo.addEventListener("click", () => activateTab("info"));
  tabSec.addEventListener("click", () => activateTab("security"));
}
