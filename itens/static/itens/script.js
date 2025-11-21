// ----------------- CSRF (padrão do Django) -----------------
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

// ----------------- Estado -----------------
let lostAndFoundItems = [];   // agora começa vazio, será carregado do backend
const ITEMS_PER_PAGE = 10;
let currentPage = 1;

// Elementos do DOM
const itemsListInicio = document.getElementById('itemsListInicio');
const paginationInicio = document.getElementById('paginationInicio');
const searchInputInicio = document.getElementById('searchInputInicio');
const itemsListRecentes = document.getElementById('itemsListRecentes');
const searchInputRecentes = document.getElementById('searchInputRecentes');

// ----------------- Funções auxiliares -----------------
const formatDate = (dateString) => {
    const date = new Date(dateString); 
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
};

const createItemCard = (item) => `
    <div class="item-card">
        <div>
            <h3>${item.name}</h3>
            <p>${item.location}</p>
        </div>
        <div class="item-right-section">
            <span class="item-date">${formatDate(item.date)}</span>
            <button class="delete-button" data-id="${item.id}" title="Marcar como encontrado e apagar">
                &times;
            </button>
        </div>
    </div>
`;

// ----------------- Renderização -----------------
function renderItems(listElement, items, page = 1) {
    listElement.innerHTML = '';
    
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const itemsToShow = items.slice(startIndex, endIndex);

    if (itemsToShow.length === 0) {
        listElement.innerHTML = '<p>Nenhum item encontrado.</p>';
        return;
    }
    itemsToShow.forEach(item => {
        listElement.innerHTML += createItemCard(item);
    });
}

function renderPagination(items) {
    paginationInicio.innerHTML = '';
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

    if (totalPages <= 1) return;

    for (let i = 1; i <= totalPages; i++) {
        const pageBtn = document.createElement('div');
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

function getFilteredItemsInicio() {
    const searchTerm = searchInputInicio.value.toLowerCase();
    if (!searchTerm) return [...lostAndFoundItems];
    
    return lostAndFoundItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm) ||
        item.location.toLowerCase().includes(searchTerm)
    );
}

function handleSearch(inputElement, listElement, isRecentTab = false) {
    const searchTerm = inputElement.value.toLowerCase();
    
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
        document.getElementById('paginationRecentes').innerHTML = '';
    }
}

// ----------------- Tabs -----------------
searchInputInicio.addEventListener('keyup', () => handleSearch(searchInputInicio, itemsListInicio, false));
searchInputRecentes.addEventListener('keyup', () => handleSearch(searchInputRecentes, itemsListRecentes, true));

document.querySelectorAll('.menu-item').forEach(link => {
    link.addEventListener('click', function(e) {
        e.preventDefault();
        
        document.querySelectorAll('.menu-item').forEach(item => item.classList.remove('active'));
        this.classList.add('active');

        const tabId = this.getAttribute('data-tab');
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.add('hidden');
        });
        document.getElementById(tabId).classList.remove('hidden');

        if (tabId === 'inicio') {
            renderItemsAndPagination(getFilteredItemsInicio());
        } else if (tabId === 'recentes') {
            searchInputRecentes.value = '';
            renderRecentItems();
        }
    });
});

// ----------------- Recentes -----------------
function getRecentItems() {
    const sortedItems = [...lostAndFoundItems].sort((a, b) => new Date(b.date) - new Date(a.date));
    return sortedItems.slice(0, 5);
}

function renderRecentItems() {
    const recentItems = getRecentItems();
    renderItems(itemsListRecentes, recentItems, 1);
}

// ----------------- Comunicação com o backend -----------------
async function loadItemsFromServer() {
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
        itemsListInicio.innerHTML = '<p>Erro ao carregar itens. Tente novamente mais tarde.</p>';
    }
}

document.getElementById('addItemForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const name = document.getElementById('itemName').value;
    const location = document.getElementById('itemLocation').value;
    const dateValue = document.getElementById('itemDate').value; // 'YYYY-MM-DD'
    const messageElement = document.getElementById('message');

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

        const newItem = await response.json();
        // Coloca no começo da lista
        lostAndFoundItems.unshift(newItem);

        messageElement.textContent = `Item "${name}" registrado com sucesso!`;
        messageElement.style.color = 'green';
        
        this.reset();
        
        currentPage = 1;
        searchInputInicio.value = '';
        renderItemsAndPagination(lostAndFoundItems);
        renderRecentItems();
    } catch (error) {
        console.error(error);
        messageElement.textContent = 'Erro ao registrar item. Tente novamente.';
        messageElement.style.color = 'red';
    }
});

async function deleteItem(id) {
    try {
        const response = await fetch(`/api/itens/${id}/`, {
            method: 'DELETE',
            headers: {
                'X-CSRFToken': csrftoken,
            },
        });

        if (!response.ok) {
            throw new Error('Erro ao apagar item');
        }

        lostAndFoundItems = lostAndFoundItems.filter(item => item.id !== id);
        
        const currentFilteredList = getFilteredItemsInicio();
        
        const totalPages = Math.ceil(currentFilteredList.length / ITEMS_PER_PAGE);
        if (currentPage > totalPages) {
            currentPage = totalPages > 0 ? totalPages : 1;
        }
        
        renderItemsAndPagination(currentFilteredList);
        renderRecentItems();
    } catch (error) {
        console.error(error);
        alert('Erro ao apagar item. Tente novamente.');
    }
}

function handleDeleteClick(event) {
    if (event.target.classList.contains('delete-button')) {
        const button = event.target;
        const itemId = Number(button.dataset.id); 
        if (confirm('Tem certeza que deseja apagar este item? \n(Esta ação marca o item como "encontrado" e o remove da lista)')) {
            deleteItem(itemId);
        }
    }
}

itemsListInicio.addEventListener('click', handleDeleteClick);
itemsListRecentes.addEventListener('click', handleDeleteClick);

// ----------------- Inicialização -----------------
document.addEventListener('DOMContentLoaded', () => {
    loadItemsFromServer();
});
