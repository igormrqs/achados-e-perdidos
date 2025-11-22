// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: internal.js
//
// Este script controla o painel interno de reivindicações.
// Objetivo (pensando como estudante de CC):
// - carregar todas as reivindicações via API interna;
// - permitir filtrar por texto (nome, item, contato);
// - atualizar o status (Pendente / Aprovada / Recusada);
// - refletir essa atualização também no status do item.
// ============================================================

let allClaims = [];

const claimsListEl = document.getElementById('claimsList');
const searchClaimsInput = document.getElementById('searchClaims');

// ----------------- Helpers -----------------

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
}

function showInfoMessage(targetElement, text) {
    targetElement.innerHTML = `<p class="info-text">${text}</p>`;
}

// ----------------- Renderização -----------------

function createClaimCard(claim) {
    const statusOptions = ['Pendente', 'Aprovada', 'Recusada'];

    const optionsHtml = statusOptions.map(status => `
        <option value="${status}" ${status === claim.status ? 'selected' : ''}>
            ${status}
        </option>
    `).join('');

    return `
        <div class="item-card claim-card" data-claim-id="${claim.id}">
            <div class="claim-main">
                <h3>${escapeHtml(claim.item.nome)}</h3>
                <p class="item-location">
                    ${escapeHtml(claim.item.local_encontrado)}
                    • Encontrado em ${formatDate(claim.item.data_encontrado)}
                </p>
                <p>
                    <strong>Requerente:</strong>
                    ${escapeHtml(claim.nome_requerente)}
                    ${claim.contato ? ` — ${escapeHtml(claim.contato)}` : ''}
                </p>
                <p class="claim-details">
                    <strong>Detalhes informados:</strong>
                    ${escapeHtml(claim.detalhes)}
                </p>
                <p class="claim-details">
                    <strong>Data da solicitação:</strong>
                    ${formatDate(claim.data_envio)}
                </p>
            </div>
            <div class="claim-actions">
                <label for="status-${claim.id}">Status da reivindicação:</label>
                <select
                    id="status-${claim.id}"
                    class="claim-status-select"
                    data-claim-id="${claim.id}"
                >
                    ${optionsHtml}
                </select>

                <button
                    type="button"
                    class="claim-save-button"
                >
                    Salvar
                </button>

                <p class="claim-status-label">
                    Item: <span>${claim.item.status}</span>
                </p>
            </div>
        </div>
    `;
}

function renderClaims(claims) {
    if (!claims || claims.length === 0) {
        showInfoMessage(
            claimsListEl,
            'Nenhuma reivindicação registrada até o momento.'
        );
        return;
    }

    claimsListEl.innerHTML = '';
    claims.forEach(claim => {
        claimsListEl.innerHTML += createClaimCard(claim);
    });
}

// ----------------- Filtro de busca -----------------

function getFilteredClaims() {
    const term = (searchClaimsInput.value || '').toLowerCase().trim();
    if (!term) return [...allClaims];

    return allClaims.filter(claim => {
        const itemName = (claim.item.nome || '').toLowerCase();
        const local = (claim.item.local_encontrado || '').toLowerCase();
        const nome = (claim.nome_requerente || '').toLowerCase();
        const contato = (claim.contato || '').toLowerCase();

        return (
            itemName.includes(term) ||
            local.includes(term) ||
            nome.includes(term) ||
            contato.includes(term)
        );
    });
}

if (searchClaimsInput) {
    searchClaimsInput.addEventListener('input', () => {
        const filtered = getFilteredClaims();
        renderClaims(filtered);
    });
}

// ----------------- Carregamento da API -----------------

async function loadClaims() {
    showInfoMessage(claimsListEl, 'Carregando reivindicações, só um instante...');

    try {
        const response = await fetch('/api/interno/reivindicacoes/');
        if (!response.ok) {
            throw new Error('Erro ao carregar reivindicações');
        }

        const data = await response.json();
        allClaims = data;
        renderClaims(allClaims);
    } catch (error) {
        console.error(error);
        showInfoMessage(
            claimsListEl,
            'Não foi possível carregar as reivindicações agora. Tente recarregar a página em alguns instantes.'
        );
    }
}

// ----------------- Atualizar status -----------------

async function updateClaimStatus(claimId, newStatus, cardElement) {
    try {
        const response = await fetch(`/api/interno/reivindicacoes/${claimId}/status/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status');
        }

        const data = await response.json();

        // Atualizo label do item no card
        const label = cardElement.querySelector('.claim-status-label span');
        if (label && data.item_status) {
            label.textContent = data.item_status;
        }

        // Atualizo também na lista em memória
        allClaims = allClaims.map(claim => {
            if (claim.id === claimId) {
                return {
                    ...claim,
                    status: data.status,
                    item: {
                        ...claim.item,
                        status: data.item_status,
                    },
                };
            }
            return claim;
        });

        // feedback visual simples
        cardElement.classList.add('updated-ok');
        setTimeout(() => {
            cardElement.classList.remove('updated-ok');
        }, 800);

    } catch (error) {
        console.error(error);
        alert('Não foi possível atualizar o status. Tente novamente.');
    }
}

// Delegação de eventos para os botões "Salvar"
if (claimsListEl) {
    claimsListEl.addEventListener('click', async (event) => {
        const button = event.target.closest('.claim-save-button');
        if (!button) return;

        const card = button.closest('.claim-card');
        if (!card) return;

        const claimId = Number(card.dataset.claimId);
        const select = card.querySelector('.claim-status-select');
        if (!claimId || !select) return;

        const newStatus = select.value;
        await updateClaimStatus(claimId, newStatus, card);
    });
}

// ----------------- Inicialização -----------------

document.addEventListener('DOMContentLoaded', () => {
    loadClaims();
});
