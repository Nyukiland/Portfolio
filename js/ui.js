// Modal Logic
const modalOverlay = document.getElementById('project-modal');
const closeBtn = document.querySelector('.close-btn');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalVideo = document.getElementById('modal-video');
const modalImage = document.getElementById('modal-image');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let currentMediaElement = null; // Garde en mémoire quel média est affiché

function openModal(cardElement)
{
    window.isInteractionPaused = true; 

    const tag = cardElement.querySelector('.tech-tag').innerText;
    const title = cardElement.querySelector('h3').innerText;
    const hiddenDetails = cardElement.querySelector('.hidden-details').innerHTML;
    
    const videoSrc = cardElement.getAttribute('data-video');
    const imageSrc = cardElement.getAttribute('data-image');

    modalTag.innerText = tag;
    modalTitle.innerText = title;
    modalDescription.innerHTML = hiddenDetails;
    
    // Gérer l'affichage Vidéo OU Image
    if (videoSrc) 
    {
        modalVideo.src = videoSrc;
        modalVideo.style.display = 'block';
        modalImage.style.display = 'none';
        modalVideo.play();
        currentMediaElement = modalVideo;
    } 
    else if (imageSrc)
    {
        modalImage.src = imageSrc;
        modalImage.style.display = 'block';
        modalVideo.style.display = 'none';
        modalVideo.pause();
        currentMediaElement = modalImage;
    }

    modalOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal()
{
    window.isInteractionPaused = false; 

    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    modalVideo.pause(); 
    
    // Quitter le plein écran si on ferme la modale
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

// Fullscreen Logic
fullscreenBtn.addEventListener('click', () => {
    if (!currentMediaElement) return;

    if (!document.fullscreenElement) {
        currentMediaElement.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});

// Event Listeners
closeBtn.addEventListener('click', closeModal);

modalOverlay.addEventListener('click', (e) =>
{
    if (e.target === modalOverlay)
    {
        closeModal();
    }
});

document.addEventListener('keydown', (e) =>
{
    if (e.key === 'Escape' && modalOverlay.classList.contains('active'))
    {
        closeModal();
    }
});