import './general'

const modules = import.meta.glob('../views/components/**/*.js')

for (const path in modules) {
    modules[path]()
}


/* Promo Video */
// on preview show iframe
// const promoVideo = document.getElementById('PromoVideo2');

// if (promoVideo) {
//     promoVideo.addEventListener('show.bs.modal', function (e) {
//         const idVideo = e.relatedTarget.getAttribute('data-id');
//         const modalBody = promoVideo.querySelector('.modal-body');
//         modalBody.innerHTML = `<div class="responsive-embed"><iframe width="100%" height="400px" src="https://www.youtube.com/embed/${idVideo}?autoplay=true" frameborder="0" allowfullscreen></iframe></div>`;
//     });

//     // Move focus from .custom-btn to .dropdown-toggle
//     if (document.activeElement === bannerButton) {
//         e.preventDefault();
//         dropdownToggle.focus();
//     }
// }