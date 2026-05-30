class TopNav extends HTMLElement 
{
    connectedCallback() 
    {
        this.innerHTML = `
            <div id="top-nav">
              <button class="hamburger" id="hamburger-btn">
                <span></span>
                <span></span>
                <span></span>
              </button>
              <nav class="dropdown" id="dropdown-menu">
                <a href="index.html">Home</a>
                <a href="infiniteflower.html">Infinite Flower</a>
                <a href="lsystem.html">Flourishing L-System</a>
                <a href="cv.html">CV</a>
                <a href="linktree.html">LinkTree</a>
              </nav>
            </div>
        `;

        const hamburgerBtn = this.querySelector('#hamburger-btn');
        const dropdownMenu = this.querySelector('#dropdown-menu');

        if (hamburgerBtn && dropdownMenu) 
        {
            hamburgerBtn.addEventListener('click', (e) => 
            {
                dropdownMenu.classList.toggle('open');
                hamburgerBtn.classList.toggle('open');
            });
        }
    }
}

customElements.define('top-nav', TopNav);