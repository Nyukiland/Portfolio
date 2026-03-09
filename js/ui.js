
function toggleProject(element) 
{
    document.querySelectorAll('.project').forEach(p => 
    {
        if (p !== element) p.classList.remove('active');
    });
    
    element.classList.toggle('active');
}