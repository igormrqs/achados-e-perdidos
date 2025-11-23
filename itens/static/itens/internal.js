// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: internal.js
//
// Painel interno:
// - Abas: Reivindicações e Itens;
// - Lista reivindicações (com vínculo, identificação, contato);
// - Atualiza status de reivindicação;
// - Volta item para estoque (correção de erro);
// - Lista itens (estoque, reivindicados, devolvidos);
// - Marca item como devolvido.
// ============================================================

// Estado em memória
let allClaims = [];
let allItems = [];

// Elementos gerais
const claimsListEl = document.getElementById('claimsList');
const searchClaimsInput = document.getElementById('searchClaims');

const itemsListEl = document.getElementById('itemsList');
const searchItemsInput = document.getElementById('searchItems');
const filterStatusSelect = document.getElementById('filterStatus');
const filterAprovadoSelect = document.getElementById('filterAprovado');

// Abas do painel interno
const internalTabs = document.querySelectorAll('.menu .menu-item[data-tab]');
const internalTabContents = document.querySelectorAll('.content .tab-content');

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

// ----------------- Tabs internas -----------------

if (internalTabs.length) {
    internalTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;

            internalTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            internalTabContents.forEach(section => {
                if (section.id === target) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    });
}

// ----------------- Reivindicações -----------------

function createClaimCard(claim) {
    const statusOptions = ['Pendente', 'Aprovada', 'Recusada'];
    const optionsHtml = statusOptions.map(status => `
        <option value="${status}" ${status === claim.status ? 'selected' : ''}>
            ${status}
        </option>
    `).join('');

    const canResetItem = claim.item.status !== 'Em estoque';

    const vinculoLabel = claim.vinculo ? ` (${claim.vinculo})` : '';
    const identificacaoLabel = claim.identificacao
        ? ` — ID: ${escapeHtml(claim.identificacao)}`
        : '';

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
                    ${escapeHtml(claim.nome_requerente)}${vinculoLabel}${identificacaoLabel}
                </p>
                <p class="claim-details">
                    <strong>Contato:</strong>
                    ${escapeHtml(claim.contato || 'não informado')}
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

function getFilteredClaims() {
    const term = (searchClaimsInput?.value || '').toLowerCase().trim();
    if (!term) return [...allClaims];

    return allClaims.filter(claim => {
        const itemName = (claim.item.nome || '').toLowerCase();
        const local = (claim.item.local_encontrado || '').toLowerCase();
        const nome = (claim.nome_requerente || '').toLowerCase();
        const contato = (claim.contato || '').toLowerCase();
        const vinculo = (claim.vinculo || '').toLowerCase();
        const identificacao = (claim.identificacao || '').toLowerCase();

        return (
            itemName.includes(term) ||
            local.includes(term) ||
            nome.includes(term) ||
            contato.includes(term) ||
            vinculo.includes(term) ||
            identificacao.includes(term)
        );
    });
}

if (searchClaimsInput) {
    searchClaimsInput.addEventListener('input', () => {
        const filtered = getFilteredClaims();
        renderClaims(filtered);
    });
}

// ----------------- Lista de Itens -----------------

function createItemCard(item) {
    const aprovacaoTexto = item.aprovado
        ? 'Aprovado para aparecer no site'
        : 'Pendente de aprovação';

    const canBackToStock = item.status !== 'Em estoque';
    const canMarkReturned = item.status !== 'Devolvido';

    const approvalButtonLabel = item.aprovado
        ? 'Retirar do site'
        : 'Aprovar para aparecer no site';

    return `
        <div class="item-card claim-card internal-item-card"
             data-item-id="${item.id}"
             data-aprovado="${item.aprovado ? 'true' : 'false'}">
            <div class="claim-main">
                <h3>${escapeHtml(item.nome)}</h3>
                <p class="item-location">
                    ${escapeHtml(item.local_encontrado)}
                    • Encontrado em ${formatDate(item.data_encontrado)}
                </p>
                <p class="claim-details">
                    <strong>Categoria:</strong>
                    ${escapeHtml(item.categoria || 'não informado')}
                </p>
                <p class="claim-details item-approval-text">
                    <strong>Aprovação:</strong>
                    ${aprovacaoTexto}
                </p>
            </div>
            <div class="claim-actions">
                <p class="claim-status-label">
                    Status do item: <span>${item.status}</span>
                </p>

                <button
                    type="button"
                    class="item-approval-button item-toggle-approval-button"
                    data-item-id="${item.id}"
                >
                    ${approvalButtonLabel}
                </button>

                <button
                    type="button"
                    class="item-mark-returned-button"
                    data-item-id="${item.id}"
                    ${canMarkReturned ? '' : 'disabled'}
                >
                    Marcar como devolvido
                </button>

                <button
                    type="button"
                    class="item-reset-button"
                    data-item-id="${item.id}"
                    ${canBackToStock ? '' : 'disabled'}
                >
                    Voltar item para estoque
                </button>
            </div>
        </div>
    `;
}


function getFilteredItems() {
    let result = [...allItems];

    const term = (searchItemsInput?.value || '').toLowerCase().trim();
    const statusFilter = filterStatusSelect?.value || '';
    const aprovadoFilter = filterAprovadoSelect?.value || '';

    if (term) {
        result = result.filter(item => {
            const nome = (item.nome || '').toLowerCase();
            const local = (item.local_encontrado || '').toLowerCase();
            const categoria = (item.categoria || '').toLowerCase();
            return (
                nome.includes(term) ||
                local.includes(term) ||
                categoria.includes(term)
            );
        });
    }

    if (statusFilter) {
        result = result.filter(item => item.status === statusFilter);
    }

    if (aprovadoFilter === 'true') {
        result = result.filter(item => item.aprovado === true);
    } else if (aprovadoFilter === 'false') {
        result = result.filter(item => item.aprovado === false);
    }

    return result;
}

function renderItemsList() {
    if (!itemsListEl) return;

    const items = getFilteredItems();

    if (!items.length) {
        showInfoMessage(
            itemsListEl,
            'Nenhum item encontrado com os filtros atuais.'
        );
        return;
    }

    itemsListEl.innerHTML = '';
    items.forEach(item => {
        itemsListEl.innerHTML += createItemCard(item);
    });
}

if (searchItemsInput) {
    searchItemsInput.addEventListener('input', renderItemsList);
}
if (filterStatusSelect) {
    filterStatusSelect.addEventListener('change', renderItemsList);
}
if (filterAprovadoSelect) {
    filterAprovadoSelect.addEventListener('change', renderItemsList);
}

// ----------------- Carregamento das APIs -----------------

async function loadClaims() {
    if (!claimsListEl) return;

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

async function loadItems() {
    if (!itemsListEl) return;

    showInfoMessage(itemsListEl, 'Carregando itens, só um instante...');

    try {
        const response = await fetch('/api/interno/itens/');
        if (!response.ok) {
            throw new Error('Erro ao carregar itens');
        }

        const data = await response.json();
        allItems = data;
        renderItemsList();
    } catch (error) {
        console.error(error);
        showInfoMessage(
            itemsListEl,
            'Não foi possível carregar os itens agora. Tente recarregar a página em alguns instantes.'
        );
    }
}

// ----------------- Ações: atualizar status e estoque -----------------

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

        // Atualizo label do item no card de reivindicação
        const label = cardElement.querySelector('.claim-status-label span');
        if (label && data.item_status) {
            label.textContent = data.item_status;
        }

        // Atualizo na lista de reivindicações
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

        // Atualizo também na lista de itens, se já carregada
        allItems = allItems.map(item => {
            if (item.id === cardElement.dataset.itemId) {
                return {
                    ...item,
                    status: data.item_status,
                };
            }
            return item;
        });
        renderItemsList();

        cardElement.classList.add('updated-ok');
        setTimeout(() => {
            cardElement.classList.remove('updated-ok');
        }, 800);

    } catch (error) {
        console.error(error);
        alert('Não foi possível atualizar o status. Tente novamente.');
    }
}

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

        // Atualizo label do item no card (tanto na aba de reivindicações quanto na de itens)
        const label = cardElement.querySelector('.claim-status-label span');
        if (label && data.status) {
            label.textContent = data.status;
        }

        // Atualiza arrays em memória
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

        allItems = allItems.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    status: data.status,
                };
            }
            return item;
        });
        renderItemsList();

        // Desabilita o botão de reset deste card, se existir
        const resetButton = cardElement.querySelector('.item-reset-button');
        if (resetButton) {
            resetButton.disabled = true;
        }

        cardElement.classList.add('updated-ok');
        setTimeout(() => {
            cardElement.classList.remove('updated-ok');
        }, 800);

    } catch (error) {
        console.error(error);
        alert('Não foi possível voltar o item para estoque. Tente novamente.');
    }
}

async function toggleItemApproval(itemId, currentApproved, cardElement) {
    const novoValor = !currentApproved;

    const confirmMsg = novoValor
        ? 'Aprovar este item para aparecer no site público?'
        : 'Remover este item da listagem pública do site?';

    if (!window.confirm(confirmMsg)) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/aprovar/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ aprovado: novoValor }),
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar aprovação do item');
        }

        const data = await response.json();

        // Atualiza array em memória
        allItems = allItems.map(item => {
            if (item.id === itemId) {
                return { ...item, aprovado: data.aprovado };
            }
            return item;
        });

        // Atualiza também as reivindicações (se quiser olhar lá depois)
        allClaims = allClaims.map(claim => {
            if (claim.item.id === itemId) {
                return {
                    ...claim,
                    item: {
                        ...claim.item,
                        aprovado: data.aprovado,
                    },
                };
            }
            return claim;
        });

        // Re-renderiza lista de itens respeitando os filtros
        renderItemsList();
        // E a de reivindicações (pra não ficar desatualizada)
        renderClaims(getFilteredClaims());

    } catch (error) {
        console.error(error);
        alert('Não foi possível atualizar a aprovação do item. Tente novamente.');
    }
}


async function markItemAsReturned(itemId, cardElement) {
    const confirmReturn = window.confirm(
        'Confirmar devolução deste item ao dono? O status será marcado como "Devolvido".'
    );
    if (!confirmReturn) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/devolver/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
        });

        if (!response.ok) {
            throw new Error('Erro ao marcar item como devolvido');
        }

        const data = await response.json();

        // Atualizo label do item no card
        const label = cardElement.querySelector('.claim-status-label span');
        if (label && data.status) {
            label.textContent = data.status;
        }

        // Atualiza arrays em memória
        allItems = allItems.map(item => {
            if (item.id === itemId) {
                return {
                    ...item,
                    status: data.status,
                };
            }
            return item;
        });
        renderItemsList();

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
        renderClaims(getFilteredClaims());

        // Desabilita botão "Marcar como devolvido" desse card
        const btn = cardElement.querySelector('.item-mark-returned-button');
        if (btn) {
            btn.disabled = true;
        }

        cardElement.classList.add('updated-ok');
        setTimeout(() => {
            cardElement.classList.remove('updated-ok');
        }, 800);

    } catch (error) {
        console.error(error);
        alert('Não foi possível marcar o item como devolvido. Tente novamente.');
    }
}

// ----------------- Delegação de eventos -----------------

// Reivindicações
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

// Itens
if (itemsListEl) {
    itemsListEl.addEventListener('click', async (event) => {
        const card = event.target.closest('.internal-item-card');
        if (!card) return;

        const itemId = Number(card.dataset.itemId);
        if (!itemId) return;

        const markReturnedBtn = event.target.closest('.item-mark-returned-button');
        const resetBtn = event.target.closest('.item-reset-button');
        const toggleApprovalBtn = event.target.closest('.item-toggle-approval-button');

        if (markReturnedBtn && !markReturnedBtn.disabled) {
            await markItemAsReturned(itemId, card);
            return;
        }

        if (resetBtn && !resetBtn.disabled) {
            await resetItemToStock(itemId, card);
            return;
        }

        if (toggleApprovalBtn) {
            const currentApproved = card.dataset.aprovado === 'true';
            await toggleItemApproval(itemId, currentApproved, card);
        }
    });
}


// ----------------- Inicialização -----------------

document.addEventListener('DOMContentLoaded', () => {
    loadClaims();
    loadItems();
});
