/**
 * DEVICE DETECTION
 * Helper to identify hardware and OS.
 */
function getDeviceDetails() {
    if (navigator.userAgentData) {
        const platformInfo = navigator.userAgentData.platform || "unknown";
        const deviceType = navigator.userAgentData.mobile ? "Mobile" : "Desktop";
        return { os: platformInfo, type: deviceType };
    }
    const ua = navigator.userAgent;
    let os = "Unknown", type = "Desktop";
    if (/android/i.test(ua)) { os = "Android"; type = "Mobile"; }
    else if (/iPad|iPhone|iPod/.test(ua)) { os = "iOS"; type = "Mobile"; }
    else if (/Windows/.test(ua)) { os = "Windows"; }
    else if (/Macintosh|Mac OS X/.test(ua)) { os = "macOS"; }
    
    if (/(tablet|playbook|silk)|(android(?!.*mobi))/i.test(ua)) { type = "Tablet"; }
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle/.test(ua)) { type = "Mobile"; }
    return { os: os, type: type };
}

// Maximum number of pages retained in the navigation trail
const MAX_HISTORY = 15;

document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    
    /**
     * ATTRIBUTION & CLICK ID CAPTURE
     */
    const utmTags = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'];
    const clickIdParams = ['gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'li_fat_id'];

    utmTags.forEach(tag => {
        if (urlParams.has(tag)) localStorage.setItem(tag, urlParams.get(tag));
    });

    clickIdParams.forEach(param => {
        if (urlParams.has(param)) {
            const val = urlParams.get(param);
            localStorage.setItem(param, val);
            localStorage.setItem('click_id', val); 
        }
    });

    /**
     * PAGE HISTORY & NAVIGATION
     * Session-scoped so the trail resets per visit, and capped at MAX_HISTORY.
     */
    const currentPath = window.location.pathname;
    let history = JSON.parse(sessionStorage.getItem('page_history_array') || "[]");
    
    // Only add to history if it's a new page load or refresh
    if (history[history.length - 1] !== currentPath) {
        history.push(currentPath);
        // Keep only the most recent entries so the field can't grow unbounded
        if (history.length > MAX_HISTORY) history = history.slice(-MAX_HISTORY);
        sessionStorage.setItem('page_history_array', JSON.stringify(history));
    }
    sessionStorage.setItem('page_history', history.join(' > '));

    const currentPage = window.location.href;
    const previousPage = document.referrer || 'direct';
    localStorage.setItem('last_referrer', previousPage);
    localStorage.setItem('current_page_url', currentPage);

    if (!sessionStorage.getItem('session_id')) {
        sessionStorage.setItem('session_id', 'sess_' + Math.random().toString(36).slice(2, 11));
    }

    if (!localStorage.getItem('landing_page')) {
        const device = getDeviceDetails();
        localStorage.setItem('landing_page', currentPath);
        localStorage.setItem('initial_referrer', document.referrer || 'Direct');
        localStorage.setItem('device_os', device.os);
        localStorage.setItem('device_type', device.type);
        localStorage.setItem('browser_language', navigator.language);
        localStorage.setItem('user_timezone', Intl.DateTimeFormat().resolvedOptions().timeZone);
    }

    /**
     * ENGAGEMENT TRACKING
     * Page views and active seconds are session-scoped, not lifetime totals.
     */
    let pvs = parseInt(sessionStorage.getItem('pv_total') || 0);
    sessionStorage.setItem('pv_total', pvs + 1);

    let activeSec = parseInt(sessionStorage.getItem('active_sec') || 0);
    setInterval(() => {
        if (!document.hidden) {
            activeSec++;
            sessionStorage.setItem('active_sec', activeSec);
        }
    }, 1000);

    /**
     * AUTOMATIC FORM FIELD CREATION & INJECTION
     * This section finds all forms and creates hidden fields if they don't exist.
     */
    const injectFields = () => {
        const forms = document.querySelectorAll('form');
        const dataMap = {
            'utm_source': localStorage.getItem('utm_source'),
            'utm_medium': localStorage.getItem('utm_medium'),
            'utm_campaign': localStorage.getItem('utm_campaign'),
            'utm_term': localStorage.getItem('utm_term'),
            'utm_content': localStorage.getItem('utm_content'),
            'click_id': localStorage.getItem('click_id'),
            'landing_page': localStorage.getItem('landing_page'),
            'page_history': sessionStorage.getItem('page_history'),
            'last_referrer': localStorage.getItem('last_referrer'),
            'current_page_url': localStorage.getItem('current_page_url'),
            'session_id': sessionStorage.getItem('session_id'),
            'device_os': localStorage.getItem('device_os'),
            'device_type': localStorage.getItem('device_type'),
            'browser_language': localStorage.getItem('browser_language'),
            'user_timezone': localStorage.getItem('user_timezone'),
            'pv_total': sessionStorage.getItem('pv_total'),
            'active_sec': sessionStorage.getItem('active_sec'),
            'submission_timestamp': new Date().toISOString()
        };

        forms.forEach(form => {
            // Identify the form for the CRM
            dataMap['form_id'] = form.id || form.getAttribute('name') || 'unnamed_form';

            for (const [key, value] of Object.entries(dataMap)) {
                if (value !== null && value !== undefined) {
                    let input = form.querySelector(`input[name="${key}"]`);
                    
                    // Create the hidden field if it doesn't exist
                    if (!input) {
                        input = document.createElement('input');
                        input.type = 'hidden';
                        input.name = key;
                        form.appendChild(input);
                    }
                    
                    // Update the value
                    input.value = value;
                }
            }
        });
    };

    // Run immediately and then every 2 seconds to keep 'active_sec' and 'timestamp' fresh
    injectFields();
    setInterval(injectFields, 2000); 
});
