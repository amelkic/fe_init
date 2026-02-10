import './_c_header.scss';

// Search Panel 

const handleSearchToggle = () => {
    const searchPanel = document.getElementById('search-panel');
    searchPanel?.classList.toggle('open');
    searchPanel?.getElementsByClassName('headersearchInput')[0]?.focus();
};

// Apply to both desktop and mobile buttons
document.getElementById('search-button')?.addEventListener('click', handleSearchToggle);
document.getElementById('search-button-mobile')?.addEventListener('click', handleSearchToggle);


// Find the element with the "close-panel" class
document.querySelector('.close-panel')?.addEventListener('click', () => {
    document.querySelector('.open')?.classList.remove('open');
});

// Header sticky    
const header = document.querySelector("header");

window.addEventListener('scroll', () => {
    header?.classList.toggle("sticky-header", window.scrollY >= 1);
});


// Mega menu

document.querySelectorAll('.dropdown-menu').forEach(element => {
    element.addEventListener('click', e => e.stopPropagation());
});

// Mobile menu

const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".menu-nav-mobile");
const focusableSelectors = 'a, button, input, textarea, select, [tabindex]:not([tabindex="-1"])';

let focusableElements, firstFocusableElement, lastFocusableElement;

const updateFocusableElements = () => {
    focusableElements = navMenu?.querySelectorAll(focusableSelectors);
    firstFocusableElement = focusableElements?.[0];
    lastFocusableElement = focusableElements?.[focusableElements.length - 1];
};

const handleTabKey = (event) => {
    if (event.key !== "Tab") return;

    updateFocusableElements();
    const activeElement = document.activeElement;
    const activeSecondLevel = document.querySelector('.second-level.active');

    if (activeSecondLevel) {
        const secondLevelElements = activeSecondLevel.querySelectorAll(focusableSelectors);
        const lastSecondLevelItem = secondLevelElements[secondLevelElements.length - 1];
        const backButton = activeSecondLevel.querySelector('.back__menu');

        if (!event.shiftKey && activeElement === lastSecondLevelItem && backButton) {
            event.preventDefault();
            backButton.focus();
            return;
        }
    }

    requestAnimationFrame(() => {
        if (!event.shiftKey && activeElement === lastFocusableElement) {
            event.preventDefault();
            hamburger?.focus();
        } else if (event.shiftKey && activeElement === hamburger) {
            event.preventDefault();
            lastFocusableElement?.focus();
        }
    });
};

const closeOnEscape = (event) => {
    if (event.key === "Escape") {
        navMenu?.classList.remove("active");
        hamburger?.classList.remove("active");
        hamburger?.setAttribute("aria-expanded", "false");
        navMenu?.setAttribute('aria-hidden', 'true');
        document.removeEventListener("keydown", handleTabKey);
        document.removeEventListener("keydown", closeOnEscape);
        hamburger?.focus();
    }
};

// Main hamburger functionality

hamburger?.addEventListener("click", () => {
    // Close external elements
    document.querySelector("[data-lp-point='close']")?.click();
    document.querySelector('.LPMslider [aria-expanded="true"]')?.click();

    // Toggle menu
    hamburger.classList.toggle("active");
    navMenu.classList.toggle("active");

    const menuOpen = navMenu.classList.contains("active");
    hamburger.setAttribute("aria-expanded", menuOpen);
    navMenu.setAttribute('aria-hidden', !menuOpen);

    if (menuOpen) {
        updateFocusableElements();
        firstFocusableElement?.focus();
        document.addEventListener("keydown", handleTabKey);
        document.addEventListener("keydown", closeOnEscape);
    } else {
        document.removeEventListener("keydown", handleTabKey);
        document.removeEventListener("keydown", closeOnEscape);
        hamburger.focus();
    }
});

// Dropdown toggles
document.querySelectorAll('.menu-nav-mobile .dropdown-toggle').forEach(element => {
    element.addEventListener('click', () => {
        element.parentElement.querySelector('.first-level a')?.focus();
    });
});

// Level sliding
document.querySelectorAll(".menu-nav-mobile [data-level-id]").forEach(attr => {
    attr.addEventListener("click", (e) => {
        const levelId = e.target.dataset.levelId;
        const slidNav = document.querySelector(levelId);
        if (!slidNav) return;

        if (slidNav.classList.contains('active') && e.target.classList.contains('back__menu')) {
            slidNav.parentElement.querySelector(`.first-level [data-level-id="${levelId}"]`)?.focus();
        }

        slidNav.classList.toggle("active");
        slidNav.querySelector('a:not(.back__menu)')?.focus();
    });
});


// Mega Menu V2

const elements = {
    level1Items: document.querySelectorAll(".megamenu--v2--level1 li a.trigger-level2"),
    level2Containers: document.querySelectorAll(".megamenu--v2--level2 div"),
    level2Items: document.querySelectorAll(".megamenu--v2--level2 a.trigger-submenu"),
    level3Containers: document.querySelectorAll(".megamenu--v2--level3 div"),
    content2: document.querySelector(".megamenu--v2--content2")
};

// Helper function to clear level states
const clearLevelStates = () => {
    document.querySelectorAll(".megamenu--v2--level2 li").forEach(li => li.classList.remove("active"));
    elements.level3Containers.forEach(container => container.classList.remove("active"));
    elements.content2?.classList.remove("show");
};

// Helper function to update active states
const updateActiveStates = (selector, targetId) => {
    document.querySelectorAll(selector).forEach(li => {
        const href = li.querySelector("a")?.getAttribute("href")?.replace("#", "");
        li.classList.toggle("active", href === targetId);
    });
};

// Level 1 Navigation
elements.level1Items.forEach(item => {
    item.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").replace("#", "");

        updateActiveStates(".megamenu--v2--level1 li", targetId);
        elements.level2Containers.forEach(container => {
            container.classList.toggle("active", container.getAttribute("data-id") === targetId);
        });
        clearLevelStates();
        document.querySelector(`.megamenu--v2--level2 div[data-id="${targetId}"] a`)?.focus();
    });
});

// Level 2 Navigation
elements.level2Items.forEach(item => {
    item.addEventListener("click", function (e) {
        e.preventDefault();
        const targetId = this.getAttribute("href").replace("#", "");

        updateActiveStates(".megamenu--v2--level2 li", targetId);
        elements.level3Containers.forEach(container => container.classList.remove("active"));
        elements.content2?.classList.remove("show");

        elements.level3Containers.forEach(container => {
            if (container.getAttribute("data-id") === targetId) {
                container.classList.add("active");
            }
        });

        const hasActiveLevel3 = [...elements.level3Containers].some(div => div.classList.contains("active"));
        elements.content2?.classList.toggle("show", hasActiveLevel3);
        document.querySelector(`.megamenu--v2--level3 div[data-id="${targetId}"] a`)?.focus();
    });
});

// Tab Navigation
document.addEventListener("keydown", (e) => {
    if (e.key !== "Tab") return;

    const activeLevel2 = document.querySelector(".megamenu--v2--level2 div.active");
    if (activeLevel2) {
        const id = activeLevel2.getAttribute('data-id');
        const level2Links = activeLevel2.querySelectorAll("a");
        if (level2Links.length && document.activeElement === level2Links[level2Links.length - 1]) {
            e.preventDefault();
            document.querySelector(`a[href='#${id}']`)?.focus();
        }
    }

    const activeLevel3 = document.querySelector(".megamenu--v2--level3 div.active");
    if (activeLevel3) {
        const id = activeLevel3.getAttribute('data-id');
        const level3Links = activeLevel3.querySelectorAll("a");
        if (level3Links.length && document.activeElement === level3Links[level3Links.length - 1]) {
            e.preventDefault();
            document.querySelector(`a[href='#${id}']`)?.focus();
        }
    }
});

// Help Center Active Link
document.querySelectorAll('.help-center-page-content__list li[role="listitem"] a').forEach(link => {
    link.classList.toggle('active', link.getAttribute('href') === window.location.pathname);
});

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {});
} else {
    
}

