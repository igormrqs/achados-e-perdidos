// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: internal.js
// ============================================================

// Estado em memória
let allClaims = [];
let allItems = [];
let currentEditingItemId = null;

// Referências de DOM
let claimsListEl;
let itemsListEl;
let searchClaimsInput;
let searchItemsInput;
let statusFilter;
let approvalFilter;

// Form de item
let itemForm;
let itemFormTitle;
let itemFormMessage;
let itemNomeInput;
let itemLocalInput;
let itemDataInput;
let itemCategoriaInput;
let itemDescricaoInput;
let itemAprovadoInput;
let itemFormClearButton;

// ----------------- Inicialização -----------------

document.addEventListener('DOMContentLoaded', () => {
    // Pega os elementos do HTML
    claimsListEl = document.getElementById('claimsList');
    itemsListEl = document.getElementById('itemsList');
    searchClaimsInput = document.getElementById('searchClaims');
    searchItemsInput = document.getElementById('searchItems');
    statusFilter = document.getElementById('filterStatus');
    approvalFilter = document.getElementById('filterAprovado');

    itemForm = document.getElementById('itemForm');
    itemFormTitle = document.getElementById('itemFormTitle');
    itemFormMessage = document.getElementById('itemFormMessage');
    itemNomeInput = document.getElementById('itemNome');
    itemLocalInput = document.getElementById('itemLocal');
    itemDataInput = document.getElementById('itemData');
    itemCategoriaInput = document.getElementById('itemCategoria');
    itemDescricaoInput = document.getElementById('itemDescricao');
    itemAprovadoInput = document.getElementById('itemAprovado');
    itemFormClearButton = document.getElementById('itemFormClearButton');

    setupTabs();

    // Filtros de reivindicações
    if (searchClaimsInput) {
        searchClaimsInput.addEventListener('input', () => {
            renderClaims(getFilteredClaims());
        });
    }

    // Filtros de itens
    if (searchItemsInput) {
        searchItemsInput.addEventListener('input', () => {
            renderItemsList();
        });
    }

    if (statusFilter) {
        statusFilter.addEventListener('change', () => {
            renderItemsList();
        });
    }

    if (approvalFilter) {
        approvalFilter.addEventListener('change', () => {
            renderItemsList();
        });
    }

    // Submissão do formulário de item (criar/editar)
    if (itemForm) {
        itemForm.addEventListener('submit', onItemFormSubmit);
    }

    if (itemFormClearButton) {
        itemFormClearButton.addEventListener('click', () => {
            clearItemForm(true); // true = mostrar mensagem de limpo
        });
    }

    // Delegação de eventos para listas
    if (claimsListEl) {
        claimsListEl.addEventListener('click', onClaimsListClick);
    }

    if (itemsListEl) {
        itemsListEl.addEventListener('click', onItemsListClick);
    }

    // Carrega dados iniciais
    loadClaims();
    loadItems();
});

// ----------------- Tabs internas -----------------

function setupTabs() {
    const menuButtons = document.querySelectorAll('.menu-item');
    const tabSections = document.querySelectorAll('.tab-content');

    menuButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const targetId = button.dataset.tab;

            // marca o botão ativo
            menuButtons.forEach((btn) => btn.classList.remove('active'));
            button.classList.add('active');

            // mostra/esconde as seções
            tabSections.forEach((section) => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });
        });
    });
}

// ----------------- Helpers gerais -----------------

function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function formatDate(isoDate) {
    if (!isoDate) return '';
    const parts = isoDate.split('-');
    if (parts.length !== 3) return isoDate;
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
}

function showInfoMessage(targetElement, text) {
    if (!targetElement) return;
    targetElement.innerHTML = `<p class="info-text">${escapeHtml(text)}</p>`;
}

// ----------------- Carregamento de dados via API -----------------

async function loadClaims() {
    if (!claimsListEl) return;

    try {
        const response = await fetch('/api/interno/reivindicacoes/');
        if (!response.ok) {
            throw new Error('Erro ao carregar reivindicações');
        }
        allClaims = await response.json();
        renderClaims(getFilteredClaims());
    } catch (error) {
        console.error(error);
        showInfoMessage(
            claimsListEl,
            'Não foi possível carregar as reivindicações no momento.'
        );
    }
}

async function loadItems() {
    if (!itemsListEl) return;

    try {
        const response = await fetch('/api/interno/itens/');
        if (!response.ok) {
            throw new Error('Erro ao carregar itens internos');
        }
        allItems = await response.json();
        renderItemsList();
    } catch (error) {
        console.error(error);
        showInfoMessage(
            itemsListEl,
            'Não foi possível carregar a lista de itens cadastrados.'
        );
    }
}

// ===========================================================
// REIVINDICAÇÕES
// ===========================================================

const CLAIM_STATUS_OPTIONS = [
    'Pendente',
    'Em análise',
    'Aprovada',
    'Recusada',
];

function getFilteredClaims() {
    let result = [...allClaims];

    const term = (searchClaimsInput?.value || '').toLowerCase().trim();
    if (term) {
        result = result.filter((claim) => {
            const nome = (claim.nome_requerente || '').toLowerCase();
            const contato = (claim.contato || '').toLowerCase();
            const detalhes = (claim.detalhes || '').toLowerCase();
            const vinculo = (claim.vinculo || '').toLowerCase();
            const identificacao = (claim.identificacao || '').toLowerCase();
            const itemNome = (claim.item?.nome || '').toLowerCase();
            const idStr = String(claim.id || '');

            return (
                nome.includes(term) ||
                contato.includes(term) ||
                detalhes.includes(term) ||
                vinculo.includes(term) ||
                identificacao.includes(term) ||
                itemNome.includes(term) ||
                idStr.includes(term)
            );
        });
    }

    return result;
}

function renderClaims(claims) {
    if (!claimsListEl) return;

    if (!claims || !claims.length) {
        showInfoMessage(
            claimsListEl,
            'Nenhuma reivindicação registrada até o momento.'
        );
        return;
    }

    const html = claims.map(createClaimCard).join('');
    claimsListEl.innerHTML = html;
}

function createClaimCard(claim) {
    const item = claim.item || {};

    const statusOptionsHtml = CLAIM_STATUS_OPTIONS
        .map((status) => {
            const selected = status === claim.status ? 'selected' : '';
            return `<option value="${status}" ${selected}>${status}</option>`;
        })
        .join('');

    return `
        <div class="item-card claim-card internal-claim-card"
             data-claim-id="${claim.id}"
             data-item-id="${item.id}">
            <div class="claim-main">
                <h3>${escapeHtml(item.nome || 'Item sem nome')}</h3>
                <p class="item-location">
                    ${escapeHtml(item.local_encontrado || 'local não informado')}
                    • Encontrado em ${formatDate(item.data_encontrado)}
                </p>

                <p class="claim-details">
                    <strong>Requerente:</strong> ${escapeHtml(claim.nome_requerente || '')}
                    ${claim.vinculo ? ` (${escapeHtml(claim.vinculo)})` : ''}
                    ${claim.identificacao ? ` — ID: ${escapeHtml(claim.identificacao)}` : ''}
                </p>
                <p class="claim-details">
                    <strong>Contato:</strong> ${escapeHtml(claim.contato || 'não informado')}
                </p>
                <p class="claim-details">
                    <strong>Detalhes informados:</strong> ${escapeHtml(claim.detalhes || '')}
                </p>
                <p class="claim-details">
                    <strong>Data da solicitação:</strong> ${formatDate(claim.data_envio)}
                </p>
            </div>
            <div class="claim-actions">
                <p class="claim-status-label">
                    Status da reivindicação:
                </p>
                <select class="claim-status-select">
                    ${statusOptionsHtml}
                </select>
                <button type="button"
                        class="claim-save-button">
                    Salvar status
                </button>

                <p class="claim-status-label item-status-label">
                    Item: <span>${item.status || 'Sem status'}</span>
                </p>

                <button type="button"
                        class="item-reset-button"
                        ${item.status === 'Em estoque' ? 'disabled' : ''}>
                    Voltar item para estoque
                </button>
                <p class="claim-helper-text">
                    Use apenas em caso de correção de erro.
                </p>
            </div>
        </div>
    `;
}

async function onClaimsListClick(event) {
    const card = event.target.closest('.internal-claim-card');
    if (!card) return;

    const claimId = Number(card.dataset.claimId);
    const itemId = Number(card.dataset.itemId) || null;

    const saveBtn = event.target.closest('.claim-save-button');
    const resetBtn = event.target.closest('.item-reset-button');

    if (saveBtn) {
        const select = card.querySelector('.claim-status-select');
        if (!select) return;

        const newStatus = select.value;
        await updateClaimStatus(claimId, itemId, newStatus);
        return;
    }

    if (resetBtn && !resetBtn.disabled && itemId) {
        await resetItemToStock(itemId);
    }
}

async function updateClaimStatus(claimId, itemId, newStatus) {
    try {
        const response = await fetch(`/api/interno/reivindicacoes/${claimId}/status/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus }),
        });

        if (!response.ok) {
            throw new Error('Erro ao atualizar status da reivindicação');
        }

        const data = await response.json();

        // Atualiza array de reivindicações
        allClaims = allClaims.map((claim) => {
            if (claim.id === claimId) {
                const newClaim = { ...claim, status: data.status };
                if (itemId && data.item_status && claim.item) {
                    newClaim.item = { ...claim.item, status: data.item_status };
                }
                return newClaim;
            }
            return claim;
        });

        // Atualiza também o array de itens, se recebemos novo status
        if (itemId && data.item_status) {
            allItems = allItems.map((item) => {
                if (item.id === itemId) {
                    return { ...item, status: data.item_status };
                }
                return item;
            });
        }

        renderClaims(getFilteredClaims());
        renderItemsList();
    } catch (error) {
        console.error(error);
        alert('Não foi possível salvar o status da reivindicação. Tente novamente.');
    }
}

// ===========================================================
// ITENS (aba "Itens cadastrados")
// ===========================================================

function getFilteredItems() {
    let result = [...allItems];

    const term = (searchItemsInput?.value || '').toLowerCase().trim();
    if (term) {
        result = result.filter((item) => {
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

    if (statusFilter && statusFilter.value) {
        result = result.filter((item) => item.status === statusFilter.value);
    }

    if (approvalFilter && approvalFilter.value !== '') {
        const aprovadoBool = approvalFilter.value === 'true';
        result = result.filter((item) => item.aprovado === aprovadoBool);
    }

    return result;
}

function renderItemsList() {
    if (!itemsListEl) return;

    const items = getFilteredItems();

    if (!items || !items.length) {
        showInfoMessage(
            itemsListEl,
            'Nenhum item cadastrado corresponde aos filtros selecionados.'
        );
        return;
    }

    const html = items.map(createInternalItemCard).join('');
    itemsListEl.innerHTML = html;
}

function createInternalItemCard(item) {
    const aprovacaoTexto = item.aprovado
        ? 'Aprovado para aparecer no site'
        : 'Pendente de aprovação';

    const canBackToStock = item.status !== 'Em estoque';
    const canMarkReturned = item.status !== 'Devolvido';

    return `
        <div class="item-card claim-card internal-item-card"
             data-item-id="${item.id}"
             style="cursor: pointer;">
            <div class="claim-main">
                <h3>${escapeHtml(item.nome)}</h3>
                <p class="item-location">
                    ${escapeHtml(item.local_encontrado || 'local não informado')}
                    • Encontrado em ${formatDate(item.data_encontrado)}
                </p>
                <p class="claim-details">
                    <strong>Categoria:</strong>
                    ${escapeHtml(item.categoria || 'não informado')}
                </p>
                <p class="claim-details">
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
                    class="item-mark-returned-button"
                    ${canMarkReturned ? '' : 'disabled'}
                >
                    Marcar como devolvido
                </button>

                <button
                    type="button"
                    class="item-reset-button"
                    ${canBackToStock ? '' : 'disabled'}
                >
                    Voltar item para estoque
                </button>
                <div style="margin-top: 5px; font-size: 0.8rem; color: #666;">
                   (Clique no card para editar)
                </div>
            </div>
        </div>
    `;
}

// ---------- Formulário de item (criar/editar) ----------

function setFormMode(mode, item = null) {
    if (!itemFormTitle) return;

    if (mode === 'edit' && item) {
        itemFormTitle.textContent = `Editar item #${item.id}`;
    } else {
        itemFormTitle.textContent = 'Cadastrar novo item';
    }
}

function clearItemForm(showMessage = false) {
    currentEditingItemId = null;
    setFormMode('create');

    if (itemNomeInput) itemNomeInput.value = '';
    if (itemLocalInput) itemLocalInput.value = '';
    if (itemDataInput) itemDataInput.value = '';
    if (itemCategoriaInput) itemCategoriaInput.value = '';
    if (itemDescricaoInput) itemDescricaoInput.value = '';
    if (itemAprovadoInput) itemAprovadoInput.checked = false;

    if (itemFormMessage) {
        itemFormMessage.textContent = showMessage
            ? 'Formulário limpo. Pronto para um novo cadastro.'
            : '';
    }
}

// -----------------------------------------------------
// FUNÇÃO ATUALIZADA: Mudar de aba ao clicar em editar
// -----------------------------------------------------
function startEditingItem(itemId) {
    const item = allItems.find((it) => it.id === itemId);
    if (!item) return;

    currentEditingItemId = itemId;
    setFormMode('edit', item);

    if (itemNomeInput) itemNomeInput.value = item.nome || '';
    if (itemLocalInput) itemLocalInput.value = item.local_encontrado || '';
    if (itemDataInput) itemDataInput.value = item.data_encontrado || '';
    if (itemCategoriaInput) itemCategoriaInput.value = item.categoria || '';
    if (itemDescricaoInput) itemDescricaoInput.value = item.descricao || '';
    if (itemAprovadoInput) itemAprovadoInput.checked = !!item.aprovado;

    // --- MUDANÇA AQUI: Forçar o clique na aba "Novo Item" ---
    const btnNovo = document.getElementById('btnTabNovo');
    if (btnNovo) {
        btnNovo.click(); // Simula o clique na aba
    }

    // Scroll suave para o formulário
    if(itemFormTitle) itemFormTitle.scrollIntoView({ behavior: 'smooth' });

    if (itemFormMessage) {
        itemFormMessage.textContent = 'Editando item existente. Após ajustar os dados, clique em "Salvar item".';
    }
}

async function onItemFormSubmit(event) {
    event.preventDefault();

    const nome = (itemNomeInput?.value || '').trim();
    const local_encontrado = (itemLocalInput?.value || '').trim();
    const data_encontrado = (itemDataInput?.value || '').trim();
    const categoria = (itemCategoriaInput?.value || '').trim();
    const descricao = (itemDescricaoInput?.value || '').trim();
    const aprovado = !!(itemAprovadoInput && itemAprovadoInput.checked);

    if (!nome || !local_encontrado || !data_encontrado) {
        if (itemFormMessage) {
            itemFormMessage.textContent = 'Por favor, preencha nome, local e data do item.';
        }
        return;
    }

    const payload = {
        nome,
        local_encontrado,
        data_encontrado,
        categoria,
        descricao,
        aprovado,
    };

    const isEditing = !!currentEditingItemId;
    const url = isEditing
        ? `/api/interno/itens/${currentEditingItemId}/editar/`
        : '/api/interno/itens/novo/';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            throw new Error('Erro ao salvar item');
        }

        const savedItem = await response.json();

        // Atualiza ou insere no array
        const existingIndex = allItems.findIndex((it) => it.id === savedItem.id);
        if (existingIndex >= 0) {
            allItems[existingIndex] = savedItem;
        } else {
            allItems.unshift(savedItem); // item novo vai pro topo
        }

        renderItemsList();
        currentEditingItemId = savedItem.id;
        setFormMode('edit', savedItem);

        if (itemFormMessage) {
            itemFormMessage.textContent = isEditing
                ? 'Item atualizado com sucesso.'
                : 'Item cadastrado com sucesso. Você pode continuar editando ou limpar o formulário para cadastrar outro.';
        }
    } catch (error) {
        console.error(error);
        if (itemFormMessage) {
            itemFormMessage.textContent = 'Não foi possível salvar o item. Verifique os campos e tente novamente.';
        }
    }
}

// ---------- Eventos na lista de itens ----------

async function onItemsListClick(event) {
    const card = event.target.closest('.internal-item-card');
    if (!card) return;

    const itemId = Number(card.dataset.itemId);
    if (!itemId) return;

    const markReturnedBtn = event.target.closest('.item-mark-returned-button');
    const resetBtn = event.target.closest('.item-reset-button');

    // 1) Botão "Marcar como devolvido"
    if (markReturnedBtn && !markReturnedBtn.disabled) {
        await markItemAsReturned(itemId);
        return;
    }

    // 2) Botão "Voltar item para estoque"
    if (resetBtn && !resetBtn.disabled) {
        await resetItemToStock(itemId);
        return;
    }

    // 3) Clique em qualquer outro ponto do card -> carregar no formulário
    startEditingItem(itemId);
}

async function markItemAsReturned(itemId) {
    if (!confirm('Marcar este item como devolvido ao dono?')) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/devolver/`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Erro ao marcar item como devolvido');
        }

        const data = await response.json();

        allItems = allItems.map((item) =>
            item.id === itemId ? { ...item, status: data.status || 'Devolvido' } : item
        );

        allClaims = allClaims.map((claim) => {
            if (claim.item && claim.item.id === itemId) {
                return {
                    ...claim,
                    item: { ...claim.item, status: data.status || 'Devolvido' },
                };
            }
            return claim;
        });

        renderItemsList();
        renderClaims(getFilteredClaims());
    } catch (error) {
        console.error(error);
        alert('Não foi possível marcar o item como devolvido. Tente novamente.');
    }
}

async function resetItemToStock(itemId) {
    if (!confirm('Voltar este item para "Em estoque"? Use apenas em caso de correção de erro.')) return;

    try {
        const response = await fetch(`/api/interno/itens/${itemId}/back_to_stock/`, {
            method: 'POST',
        });

        if (!response.ok) {
            throw new Error('Erro ao voltar item para estoque');
        }

        const data = await response.json();

        allItems = allItems.map((item) =>
            item.id === itemId ? { ...item, status: data.status || 'Em estoque' } : item
        );

        allClaims = allClaims.map((claim) => {
            if (claim.item && claim.item.id === itemId) {
                return {
                    ...claim,
                    item: { ...claim.item, status: data.status || 'Em estoque' },
                };
            }
            return claim;
        });

        renderItemsList();
        renderClaims(getFilteredClaims());
    } catch (error) {
        console.error(error);
        alert('Não foi possível voltar o item para estoque. Tente novamente.');
    }
}