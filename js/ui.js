// Modal Logic
const modalOverlay = document.getElementById('project-modal');
const closeBtn = document.querySelector('.close-btn');
const modalTag = document.getElementById('modal-tag');
const modalTitle = document.getElementById('modal-title');
const modalDescription = document.getElementById('modal-description');
const modalVideo = document.getElementById('modal-video');

function openModal(cardElement)
{
    window.isInteractionPaused = true; 

    const tag = cardElement.querySelector('.tech-tag').innerText;
    const title = cardElement.querySelector('h3').innerText;
    const hiddenDetails = cardElement.querySelector('.hidden-details').innerHTML;
    const videoSrc = cardElement.getAttribute('data-video');

    modalTag.innerText = tag;
    modalTitle.innerText = title;
    modalDescription.innerHTML = hiddenDetails;
    
    if (videoSrc) 
    {
        modalVideo.src = videoSrc;
        modalVideo.style.display = 'block';
        modalVideo.play();
    } 
    else 
    {
        modalVideo.style.display = 'none';
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
}

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