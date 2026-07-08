async function wipeSkills() {
    let editLinks = Array.from(document.querySelectorAll('a[href*="/details/skills/edit/forms/"]'));
    
    if (editLinks.length === 0) {
        console.log("No edit links found. Please ensure you are scrolled to the bottom of the skills list.");
        return;
    }

    console.log(`Found ${editLinks.length} skills. Starting double-deletion sequence...`);

    for (let i = 0; i < editLinks.length; i++) {
        console.log(`Processing ${i + 1} of ${editLinks.length}...`);
        
        // 1. Click the specific skill's Edit anchor tag
        editLinks[i].click();
        await new Promise(r => setTimeout(r, 1500)); // Wait for first modal
        
        // 2. Find and click the initial "Delete skill" button
        let firstDeleteBtn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Delete skill'));
        
        if (firstDeleteBtn) {
            firstDeleteBtn.click();
            await new Promise(r => setTimeout(r, 1500)); // Wait for the confirmation pop-up to render
            
            // 3. Find and click the final "Delete" confirmation button
            // We filter for buttons that say exactly 'Delete' and ensure they are actually visible on screen
            let confirmBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim() === 'Delete');
            let finalDeleteBtn = confirmBtns.find(b => b.offsetParent !== null); // Checks if the element is currently visible
            
            if (finalDeleteBtn) {
                finalDeleteBtn.click();
                console.log(`Successfully deleted skill ${i + 1}.`);
                await new Promise(r => setTimeout(r, 2000)); // Wait for API response and UI reset
            } else {
                console.log(`Found first delete, but could not find confirmation button for skill ${i + 1}.`);
                document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); // Try to back out
                await new Promise(r => setTimeout(r, 1000));
            }
        } else {
            console.log(`Could not find the initial 'Delete skill' button for skill ${i + 1}.`);
            // Press 'Escape' to dismiss the modal so the loop can safely try the next one
            document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
            await new Promise(r => setTimeout(r, 1000));
        }
    }
    console.log("Skill purge complete. The slate is clean.");
}

// Execute the function
wipeSkills();
