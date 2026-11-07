export function showModal({ title, message, buttons = [] }) {
  const container = document.getElementById("content-modal");

  const destroyModal = () => {
    container.innerHTML = "";
  };

  // Lógica inteligente: Solo devuelve la clase si existe un mapeo
  const getButtonClass = (text) => {
    const t = text.toLowerCase();
    if (["confirmar", "aceptar", "sí", "entendido", "descargar"].includes(t)) {
      return "confirm-btn--success";
    }
    if (["cancelar", "cerrar", "no"].includes(t)) {
      return "confirm-btn--cancel";
    }
    return "";
  };

  // Si no se pasan botones, generamos unos por defecto
  const finalButtons =
    buttons.length > 0
      ? buttons
      : [
          { text: "Confirmar", action: null },
          { text: "Cancelar", action: null },
        ];

  const buttonsHTML = finalButtons
    .map((btn, index) => {
      const id = `btn-${index}`;
      const btnClass = btn.className || getButtonClass(btn.text);
      // Si btnClass está vacío, el atributo class solo tendrá "confirm-btn"
      return `<button class="confirm-btn ${btnClass}" id="${id}">${btn.text}</button>`;
    })
    .join("");

  container.innerHTML = `
    <div class="modal-overlay">
      <div class="modal-content">
        <h3>${title}</h3>
        <div>${message}</div>
        <div class="modal-actions">${buttonsHTML}</div>
      </div>
    </div>
  `;

  finalButtons.forEach((btn, index) => {
    document.getElementById(`btn-${index}`).onclick = async () => {
      if (btn.action) await btn.action();
      destroyModal(); // Se destruye el DOM por completo
    };
  });
}
