/**
 * Client-Side Tracking Integrado (Navegador + Servidor)
 * Este script captura a navegação, cliques e preenchimentos, enviando para o seu arquivo api-tracking.php.
 */

const Tracker = {
    // CAMINHO DO SEU ARQUIVO PHP NA HOSTGATOR
    endpoint: './api-tracking.php', 

    // Função para pegar cookies de primeiro-nível do Facebook (_fbp e _fbc)
    getCookie: function(name) {
        let match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        if (match) return match[2];
        return null;
    },

    /**
     * Função Principal de Disparo
     * @param {string} eventName - Nome do evento (ex: 'PageView', 'Lead', 'InitiateCheckout')
     * @param {object} customData - Opcional. Ex: { value: 100, currency: 'BRL' }
     * @param {object} userData - Opcional. Ex: { email: 'cliente@gmail.com', phone: '5511999999999' }
     */
    track: function(eventName, customData = {}, userData = {}) {
        // EVENT ID: O segredo para notas altas! É ele que diz que o evento do Pixel e do PHP são da mesma pessoa (Desduplicação).
        const eventId = 'evt_' + Math.floor(Math.random() * 1000000) + '_' + Date.now();
        
        // 1. DISPARO DO NAVEGADOR (PIXEL NORMAL)
        // Dispara se o pixel fbq tradicional estiver carregado na página
        if (typeof fbq === 'function') {
            fbq('track', eventName, customData, { eventID: eventId });
        } else {
            console.warn('O Pixel (fbq) não foi encontrado no cabeçalho do site, enviando apenas pelo Server.');
        }

        // Montando pacote de dados pra enviar pro seu PHP
        const payload = {
            eventName: eventName,
            eventId: eventId,
            eventUrl: window.location.href,
            fbp: this.getCookie('_fbp') || null, // Se tiver o cookie do facebook, puxa ele
            fbc: this.getCookie('_fbc') || window.location.search.match(/fbclid=([^&]*)/)?.[1] || null, // cookie ou param URL
            email: userData.email || null,
            phone: userData.phone || null,
            custom_data: customData
        };

        // 2. DISPARO SERVER-SIDE SILENCIOSO (Envia pro seu api-tracking.php)
        fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            console.log(`[⚡ TRACK ${eventName}] Enviado com sucesso via PHP:`, data);
        })
        .catch(err => {
            console.error(`[🚨 TRACK ${eventName}] Erro de envio para PHP:`, err);
        });
    }
};

// ==========================================
// DISPAROS AUTOMÁTICOS
// ==========================================

// 1. PageView automático ao carregar qualquer página que contenha este script
document.addEventListener('DOMContentLoaded', () => {
    Tracker.track('PageView');
});

// Exemplo Prático de Uso Futuro:
// Se você tem um botão de WhatsApp:
/*
document.getElementById('btn-whatsapp').addEventListener('click', function() {
    Tracker.track('Lead', { content_name: 'Botão Orçamento Whats' });
});
*/

// Exemplo para Formulários (Capturando email do lead para Nota 10 EMQ no Facebook):
/*
document.getElementById('seu-formulario-id').addEventListener('submit', function(e) {
    const emailDigitado = document.getElementById('input-email').value;
    const whatsDigitado = document.getElementById('input-phone').value;
    
    Tracker.track('Lead', {}, { email: emailDigitado, phone: "55" + whatsDigitado });
});
*/
