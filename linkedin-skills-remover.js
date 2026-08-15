(async function () {
    var POLL = 40;      // ms between checks
    var TIMEOUT = 6000; // give up on a single stuck step after this

    function visible(el) { return el && el.offsetParent !== null; }

    function btnByText(txt) {
        return Array.prototype.slice.call(document.querySelectorAll('button'))
            .find(function (b) { return visible(b) && b.innerText.trim() === txt; });
    }

    // Only real "Edit X skill" links — filters out lookalikes like "Add section"
    // whose href can momentarily match the loose /edit/forms/ substring check.
    function skillEditLinks() {
        return Array.prototype.slice.call(
            document.querySelectorAll('a[href*="/details/skills/edit/forms/"]')
        ).filter(function (a) {
            var label = (a.getAttribute('aria-label') || '').trim();
            return visible(a) && /^edit .+ skill$/i.test(label);
        });
    }

    function countLinks() {
        return skillEditLinks().length;
    }

    // Dismiss any Premium / upsell dialog. Returns true if it closed one.
    function closeUpsell() {
        var dialogs = document.querySelectorAll('[role="dialog"], .artdeco-modal');
        for (var i = 0; i < dialogs.length; i++) {
            var d = dialogs[i];
            if (!visible(d)) continue;
            if (!/premium|try it free|free trial|on a roll/i.test(d.innerText)) continue;
            var x = d.querySelector('button[aria-label*="Dismiss" i], button[aria-label*="Close" i]');
            if (x) { x.click(); return true; }
            var nt = Array.prototype.slice.call(d.querySelectorAll('button'))
                .find(function (b) { return /no thanks|not now|maybe later|skip|dismiss/i.test(b.innerText); });
            if (nt) { nt.click(); return true; }
        }
        return false;
    }

    function waitFor(getter) {
        return new Promise(function (resolve, reject) {
            var start = Date.now();
            (function poll() {
                closeUpsell();                 // clear popups on every tick
                var el;
                try { el = getter(); } catch (e) {}
                if (el) return resolve(el);
                if (Date.now() - start > TIMEOUT) return reject(new Error("timeout"));
                setTimeout(poll, POLL);
            })();
        });
    }

    // Background janitor: nuke upsells even between steps
    var janitor = setInterval(closeUpsell, 100);

    var deleted = 0, stalls = 0;
    console.log("Starting skill purge...");

    try {
        while (true) {
            var before = countLinks();
            var editLink = skillEditLinks()[0];
            if (!editLink) {
                console.log("Done. Deleted " + deleted + " skill(s). None left.");
                break;
            }

            console.log("Deleting #" + (deleted + 1) + " (" + before + " left)...");
            editLink.click();

            try {
                (await waitFor(function () { return btnByText('Delete skill'); })).click();
                (await waitFor(function () { return btnByText('Delete'); })).click();
                await waitFor(function () { return countLinks() < before; });
                deleted++;
                stalls = 0;
                console.log("Deleted #" + deleted + ".");
            } catch (e) {
                // Interrupted (upsell, slow render, or throttling). Back off and keep going.
                closeUpsell();
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
                stalls++;
                var pause = Math.min(3000, 400 * stalls);
                console.log("Stall " + stalls + " — waiting " + pause + "ms and continuing.");
                await new Promise(function (r) { setTimeout(r, pause); });
                if (stalls >= 8) {
                    console.log("8 stalls in a row — likely rate-limited. Stopping; re-run later to finish.");
                    break;
                }
            }
        }
    } finally {
        clearInterval(janitor); // always shut off the background timer
    }

    console.log("Total deleted this run: " + deleted + ".");
})();
