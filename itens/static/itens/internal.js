// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: internal.js
//
// Este script controla o painel interno de reivindicações.
// Objetivo (pensando como estudante de CC):
// - carregar todas as reivindicações via API interna;
// - permitir filtrar por texto (nome, item, contato);
// - atualizar o status (Pendente / Aprovada / Recusada);
// - voltar item para 'Em estoque' em caso de erro interno.
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

    const canResetItem = claim.item.status !== 'Em estoque';

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
                    Salvar status
                </button>

                <p class="claim-status-label">
                    Item: <span>${claim.item.status}</span>
                </p>

                <button
                    type="button"
                    class="item-reset-button"
                    data-item-id="${claim.item.id}"
                    ${canResetItem ? '' : 'disabled'}
                >
                    Voltar item para estoque
                </button>
                <small class="claim-hint">
                    Use apenas em caso de correção de erro.
                </small>
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

// ----------------- Atualizar status da reivindicação -----------------

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

        cardElement.classList.add('updated-ok');
        setTimeout(() => {
            cardElement.classList.remove('updated-ok');
        }, 800);

    } catch (error) {
        console.error(error);
        alert('Não foi possível atualizar o status. Tente novamente.');
    }
}

// ----------------- Voltar item para estoque -----------------

async function resetItemToStock(itemId, cardElement) {
    const confirmReset = window.confirm(
        'Tem certeza que deseja voltar este item para "Em estoque"? ' +
        'Use essa opção apenas em caso de correção de erro interno.'
    );
    if (!confirmReset) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/back_to_stock/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Erro ao voltar item para estoque');
        }

        const data = await response.json();

        // Atualizo label do item no card
        const label = cardElement.querySelector('.claim-status-label span');
        if (label && data.status) {
            label.textContent = data.status;
        }

        // Desabilito o botão de reset deste card
        const resetButton = cardElement.querySelector('.item-reset-button');
        if (resetButton) {
            resetButton.disabled = true;
        }

        // Atualizo todos os claims que usam esse item na lista em memória
        allClaims = allClaims.map(claim => {
            if (claim.item.id === itemId) {
                return {
                    ...claim,
                    item: {
                        ...claim.item,
                        status: data.status,
                    },
                };
            }
            return claim;
        });

        cardElement.classList.add('updated-ok');
        setTimeout(() => {
            cardElement.classList.remove('updated-ok');
        }, 800);

    } catch (error) {
        console.error(error);
        alert('Não foi possível voltar o item para estoque. Tente novamente.');
    }
}

// ----------------- Delegação de eventos -----------------

if (claimsListEl) {
    claimsListEl.addEventListener('click', async (event) => {
        const card = event.target.closest('.claim-card');
        if (!card) return;

        // 1) Salvar status da reivindicação
        const saveButton = event.target.closest('.claim-save-button');
        if (saveButton) {
            const select = card.querySelector('.claim-status-select');
            if (!select) return;

            const claimId = Number(select.dataset.claimId);
            const newStatus = select.value;

            if (!claimId) return;
            await updateClaimStatus(claimId, newStatus, card);
            return;
        }

        // 2) Voltar item para estoque
        const resetButton = event.target.closest('.item-reset-button');
        if (resetButton) {
            const itemId = Number(resetButton.dataset.itemId);
            if (!itemId || resetButton.disabled) return;

            await resetItemToStock(itemId, card);
        }
    });
}

// ----------------- Inicialização -----------------

document.addEventListener('DOMContentLoaded', () => {
    loadClaims();
});
