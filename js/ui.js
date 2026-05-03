// Modal Logic
const modalOverlay = document.getElementById('project-modal');
const closeBtn = document.querySelector('.close-btn');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalVideo = document.getElementById('modal-video');
const modalImage = document.getElementById('modal-image');
const fullscreenBtn = document.getElementById('fullscreen-btn');

let currentMediaElement = null; 

function openModal(cardElement) {
    window.isInteractionPaused = true; 

    const tag = cardElement.querySelector('.tech-tag').innerText;
    const title = cardElement.querySelector('h3').innerText;
    const hiddenDetails = cardElement.querySelector('.hidden-details').innerHTML;
    
    const videoSrc = cardElement.getAttribute('data-video');
    const imageSrc = cardElement.getAttribute('data-image');

    if (modalTag) modalTag.innerText = tag;
    if (modalTitle) modalTitle.innerText = title;
    if (modalDescription) modalDescription.innerHTML = hiddenDetails;
    
    if (videoSrc && modalVideo) {
        modalVideo.src = videoSrc;
        modalVideo.style.display = 'block';
        if (modalImage) modalImage.style.display = 'none';
        modalVideo.play();
        currentMediaElement = modalVideo;
    } 
    else if (imageSrc && modalImage) {
        modalImage.src = imageSrc;
        modalImage.style.display = 'block';
        if (modalVideo) {
            modalVideo.style.display = 'none';
            modalVideo.pause();
        }
        currentMediaElement = modalImage;
    }

    if (modalOverlay) {
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    window.isInteractionPaused = false; 

    if (modalOverlay) modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    if (modalVideo) modalVideo.pause(); 
    
    if (document.fullscreenElement) {
        document.exitFullscreen();
    }
}

// Event Listeners
if (fullscreenBtn) {
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
}

if (closeBtn) {
    closeBtn.addEventListener('click', closeModal);
}

if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) {
            closeModal();
        }
    });
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('active')) {
        closeModal();
    }
});