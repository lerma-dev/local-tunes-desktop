let tabBar;

export const initTabBar = () => {
  tabBar = document.getElementById("tab-bar");
  tabBar.addEventListener("click", (e) => {
    const clickedBtn = e.target.closest("button");
    if (!clickedBtn) return;

    // 1. Quitamos la clase .active de todos los botones
    const allButtons = tabBar.querySelectorAll("button");
    allButtons.forEach((btn) => btn.classList.remove("active"));

    // 2. Añadimos la clase .active al botón presionado
    clickedBtn.classList.add("active");
  });
};
