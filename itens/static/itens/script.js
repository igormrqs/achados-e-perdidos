// ============================================================
// Achados e Perdidos - UnDF
// Arquivo: script.js
//
// Eu (estudante de CC) estou cuidando do front em JS puro.
// Este arquivo cuida de:
// - buscar itens aprovados no backend (Django);
// - exibir a lista com paginação e busca;
// - enviar novos itens para análise (cadastro de achados);
// - permitir que o usuário reivindique um item (Blind Claim),
//   abrindo um modal e mandando os dados para a API.
//
// Deixo comentários pensando em mim mesmo no futuro,
// pra eu não me perder quando voltar a ler esse código :)
// ============================================================

// ----------------- CSRF helper (padrão do Django) -----------------
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}
const csrftoken = getCookie('csrftoken');

// ----------------- Estado global da página -----------------
let lostAndFoundItems = [];
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Elementos da DOM principais
const itemsListInicio = document.getElementById('itemsListInicio');
const paginationInicio = document.getElementById('paginationInicio');
const searchInputInicio = document.getElementById('searchInputInicio');
const itemsListRecentes = document.getElementById('itemsListRecentes');
const searchInputRecentes = document.getElementById('searchInputRecentes');
const messageElement = document.getElementById('message');

// Elementos do modal de Blind Claim
const claimModal = document.getElementById('claimModal');
const claimItemInfo = document.getElementById('claimItemInfo');
const claimForm = document.getElementById('claimForm');
const claimMessage = document.getElementById('claimMessage');
const claimCloseButton = document.getElementById('claimCloseButton');

// guardo o id do item que está sendo reivindicado no momento
let currentClaimItemId = null;

// ----------------- Mensagens na interface -----------------

function showInfoMessage(targetElement, text) {
    targetElement.innerHTML = `<p class="info-text">${text}</p>`;
}

function setFormMessage(text, type = 'info') {
    if (!messageElement) return;

    messageElement.classList.remove('message-info', 'message-error', 'message-success');
    if (type === 'success') {
        messageElement.classList.add('message-success');
    } else if (type === 'error') {
        messageElement.classList.add('message-error');
    } else {
        messageElement.classList.add('message-info');
    }

    messageElement.textContent = text;
}

// Mensagem específica para o modal de Blind Claim
function setClaimMessage(text, type = 'info') {
    if (!claimMessage) return;

    claimMessage.classList.remove('message-info', 'message-error', 'message-success');
    if (type === 'success') {
        claimMessage.classList.add('message-success');
    } else if (type === 'error') {
        claimMessage.classList.add('message-error');
    } else {
        claimMessage.classList.add('message-info');
    }

    claimMessage.textContent = text;
}

// ----------------- Datas e categorias -----------------

function formatDate(dateString) {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
        return dateString;
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

// Mapeio a categoria (texto livre) para um ícone.
function getCategoryIcon(categoryRaw) {
    const category = (categoryRaw || '').toLowerCase();

    if (category.includes('doc')) return '📄';           // documentos
    if (category.includes('chav')) return '🔑';          // chaves
    if (category.includes('eletr')) return '📱';         // eletrônicos
    if (category.includes('mochil') || category.includes('bolsa')) return '🎒';
    if (category.includes('roup') || category.includes('vest')) return '🧥';
    if (category.includes('livro') || category.includes('cader') || category.includes('mater')) return '📚';

    return '📦'; // categoria genérica
}

// ----------------- Montagem do card de item -----------------

function createItemCard(item) {
    const icon = getCategoryIcon(item.category);

    return `
        <div class="item-card">
            <div class="item-main">
                <div class="item-icon-circle">
                    <span class="item-icon-emoji">${icon}</span>
                </div>
                <div class="item-text-block">
                    <h3>${item.name}</h3>
                    <p class="item-location">${item.location}</p>
                </div>
            </div>
            <div class="item-meta">
                <span class="item-date">${formatDate(item.date)}</span>
                <button
                    type="button"
                    class="claim-button"
                    data-id="${item.id}"
                    data-name="${item.name}"
                    data-location="${item.location}"
                >
                    Este item pode ser meu
                </button>
            </div>
        </div>
    `;
}

// ----------------- Renderização de lista + paginação -----------------

function renderItems(listElement, items, page = 1) {
    listElement.innerHTML = '';

    if (!items || items.length === 0) {
        showInfoMessage(
            listElement,
            'Nenhum item cadastrado por enquanto. Assim que algum objeto for encontrado e aprovado pela equipe, ele aparecerá aqui.'
        );
        return;
    }

    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = items.slice(startIndex, endIndex);

    itemsToShow.forEach(item => {
        listElement.innerHTML += createItemCard(item);
    });
}

function renderPagination(items) {
    paginationInicio.innerHTML = '';
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.type = 'button';
        pageBtn.classList.add('page-number');
        pageBtn.textContent = i;

        if (i === currentPage) {
            pageBtn.classList.add('active');
        }

        pageBtn.addEventListener('click', () => {
            currentPage = i;
            renderItemsAndPagination(items);
        });

        paginationInicio.appendChild(pageBtn);
    }
}

function renderItemsAndPagination(items = lostAndFoundItems) {
    renderItems(itemsListInicio, items, currentPage);
    renderPagination(items);
}

// ----------------- Busca (texto) -----------------

function getFilteredItemsInicio() {
    const searchTerm = (searchInputInicio?.value || '').toLowerCase().trim();
    if (!searchTerm) return [...lostAndFoundItems];

    return lostAndFoundItems.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm)
    );
}

function handleSearch(inputElement, listElement, isRecentTab = false) {
    const searchTerm = (inputElement.value || '').toLowerCase().trim();

    let baseList;
    if (isRecentTab) {
        baseList = getRecentItems();
    } else {
        baseList = lostAndFoundItems;
    }

    const filteredItems = baseList.filter(item =>
        item.name.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm)
    );

    if (!isRecentTab) {
        currentPage = 1;
        renderItemsAndPagination(filteredItems);
    } else {
        renderItems(listElement, filteredItems, 1);
        const pagRecentes = document.getElementById('paginationRecentes');
        if (pagRecentes) pagRecentes.innerHTML = '';
    }
}

// ----------------- Tabs (menu lateral) -----------------

if (searchInputInicio) {
    searchInputInicio.addEventListener('keyup', () =>
        handleSearch(searchInputInicio, itemsListInicio, false)
    );
}

if (searchInputRecentes) {
    searchInputRecentes.addEventListener('keyup', () =>
        handleSearch(searchInputRecentes, itemsListRecentes, true)
    );
}

document.querySelectorAll('.menu-item').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        document.querySelectorAll('.menu-item').forEach(item =>
            item.classList.remove('active')
        );
        this.classList.add('active');

        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(tabId).classList.remove('hidden');

        if (tabId === 'inicio') {
            renderItemsAndPagination(getFilteredItemsInicio());
        } else if (tabId === 'recentes') {
            if (searchInputRecentes) searchInputRecentes.value = '';
            renderRecentItems();
        }
    });
});

// ----------------- Itens mais recentes (aba 2) -----------------

function getRecentItems() {
    const sortedItems = [...lostAndFoundItems].sort(
        (a, b) => new Date(b.date) - new Date(a.date)
    );
    return sortedItems.slice(0, 5);
}

function renderRecentItems() {
    const recentItems = getRecentItems();
    renderItems(itemsListRecentes, recentItems, 1);
}

// ----------------- Blind Claim: abrir/fechar modal -----------------

function openClaimModal(itemId, itemName, itemLocation) {
    currentClaimItemId = itemId;

    if (claimItemInfo) {
        const loc = itemLocation ? ` — ${itemLocation}` : '';
        claimItemInfo.textContent = `${itemName}${loc}`;
    }

    if (claimMessage) {
        claimMessage.textContent = '';
        claimMessage.classList.remove('message-info', 'message-error', 'message-success');
    }

    if (claimForm) {
        claimForm.reset();
    }

    if (claimModal) {
        claimModal.classList.remove('hidden');
    }
}

function closeClaimModal() {
    currentClaimItemId = null;
    if (claimModal) {
        claimModal.classList.add('hidden');
    }
}

// Clique no botão "X" do modal
if (claimCloseButton) {
    claimCloseButton.addEventListener('click', (e) => {
        e.preventDefault();
        closeClaimModal();
    });
}

// Clique fora do conteúdo (no fundo escuro) fecha o modal
if (claimModal) {
    claimModal.addEventListener('click', (e) => {
        if (e.target === claimModal) {
            closeClaimModal();
        }
    });
}

// ----------------- Blind Claim: captura clique no botão do card -----------------

function handleClaimClick(event) {
    const button = event.target.closest('.claim-button');
    if (!button) return;

    const id = Number(button.dataset.id);
    const name = button.dataset.name || 'Item';
    const location = button.dataset.location || '';

    if (!id) return;

    openClaimModal(id, name, location);
}

if (itemsListInicio) {
    itemsListInicio.addEventListener('click', handleClaimClick);
}

if (itemsListRecentes) {
    itemsListRecentes.addEventListener('click', handleClaimClick);
}

// ----------------- Blind Claim: envio do formulário -----------------

if (claimForm) {
    claimForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        if (!currentClaimItemId) {
            setClaimMessage(
                'Não foi possível identificar o item selecionado. Feche o formulário e tente novamente a partir da lista.',
                'error'
            );
            return;
        }

        const nome = document.getElementById('claimNome').value.trim();
        const contato = document.getElementById('claimContato').value.trim();
        const detalhes = document.getElementById('claimDetalhes').value.trim();

        if (!nome || !detalhes) {
            setClaimMessage(
                'Por favor, preencha seu nome e os detalhes que comprovam que o item é seu.',
                'error'
            );
            return;
        }

        try {
            const response = await fetch(`/api/itens/${currentClaimItemId}/claim/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    nome: nome,
                    contato: contato,
                    detalhes: detalhes,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao enviar reivindicação');
            }

            await response.json();

            setClaimMessage(
                'Reivindicação enviada com sucesso! A equipe da UnDF irá analisar e entrar em contato se necessário.',
                'success'
            );

            // Fecho o modal depois de alguns segundos para não "sumir" a mensagem na hora.
            setTimeout(() => {
                closeClaimModal();
            }, 2000);
        } catch (error) {
            console.error(error);
            setClaimMessage(
                'Não foi possível enviar sua reivindicação agora. Tente novamente em alguns instantes.',
                'error'
            );
        }
    });
}

// ----------------- Comunicação com o backend -----------------

async function loadItemsFromServer() {
    showInfoMessage(itemsListInicio, 'Carregando itens, só um instante...');

    try {
        const response = await fetch('/api/itens/');
        if (!response.ok) {
            throw new Error('Erro ao carregar itens');
        }

        const data = await response.json();
        lostAndFoundItems = data;
        currentPage = 1;
        renderItemsAndPagination();
        renderRecentItems();
    } catch (error) {
        console.error(error);
        showInfoMessage(
            itemsListInicio,
            'Ops, não conseguimos carregar os itens agora. Tente recarregar a página em alguns instantes.'
        );
    }
}

// ----------------- Formulário "Adicionar Novo Item Encontrado" -----------------

const addItemForm = document.getElementById('addItemForm');

if (addItemForm) {
    addItemForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const name = document.getElementById('itemName').value.trim();
        const location = document.getElementById('itemLocation').value.trim();
        const dateValue = document.getElementById('itemDate').value; // 'YYYY-MM-DD'

        if (!name || !location || !dateValue) {
            setFormMessage(
                'Por favor, preencha todos os campos obrigatórios antes de registrar o item.',
                'error'
            );
            return;
        }

        try {
            const response = await fetch('/api/itens/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': csrftoken,
                },
                body: JSON.stringify({
                    name: name,
                    location: location,
                    date: dateValue,
                }),
            });

            if (!response.ok) {
                throw new Error('Erro ao registrar item');
            }

            await response.json();

            setFormMessage(
                'Item enviado para análise da equipe interna. Após aprovação, ele ficará visível na lista pública.',
                'success'
            );

            this.reset();
            loadItemsFromServer();
        } catch (error) {
            console.error(error);
            setFormMessage(
                'Ops, não foi possível enviar o item agora. Verifique sua conexão e tente novamente.',
                'error'
            );
        }
    });
}

// ----------------- Inicialização da página -----------------

document.addEventListener('DOMContentLoaded', () => {
    loadItemsFromServer();
});
