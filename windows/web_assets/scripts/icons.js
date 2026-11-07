class LermaIcon extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() { return ['name']; }

    connectedCallback() { this.render(); }
    attributeChangedCallback() { this.render(); }

    render() {
        const name = this.getAttribute('name') || 'help';
        const path = `assets/lerma-icons/${name}.svg`;

        this.shadowRoot.innerHTML = `
        <style>
            :host {
                display: inline-block;
                width: 1em;
                height: 1em;
                vertical-align: middle;
            }
            .icon-inner {
                width: 100%;
                height: 100%;
                background-color: currentColor; /* OBEDECE AL CSS EXTERNO */
                -webkit-mask-image: url(${path});
                mask-image: url(${path});
                -webkit-mask-size: contain;
                mask-size: contain;
                -webkit-mask-repeat: no-repeat;
                mask-repeat: no-repeat;
            }
        </style>
        <div class="icon-inner"></div>
        `;
    }
}
customElements.define('l-icon', LermaIcon);
