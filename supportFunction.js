/**
 * Function to measure how much of a box is supported by boxes beneath or the bin container
 * @param {Object} box - The box to check support for {x, y, width, height}
 * @param {Array} positions - Array of all placed boxes [{x, y, width, height}]
 * @param {Number} binHeight - Height of the bin container
 * @returns {Number} - The percentage of the box that is supported (0 to 100)
 */
function measureSupport(box, positions, binHeight) {
    let supportedWidth = 0;
    const boxBottom = box.y + box.height;

    // Check if the box is supported by the bin container bottom
    if (boxBottom >= binHeight) {
        supportedWidth = box.width;
    } else {
        // Check support from other boxes
        positions.forEach(pos => {
            const posTop = pos.y;
            const posBottom = pos.y + pos.height;

            // Check if there is overlap in width and pos is directly beneath the box
            if (posTop === boxBottom) {
                const overlapStart = Math.max(box.x, pos.x);
                const overlapEnd = Math.min(box.x + box.width, pos.x + pos.width);
                const overlapWidth = Math.max(0, overlapEnd - overlapStart);
                supportedWidth += overlapWidth;
            }
        });

        // Ensure we do not exceed the box's width
        supportedWidth = Math.min(supportedWidth, box.width);
    }

    // Calculate percentage of support
    const supportPercentage = (supportedWidth / box.width) * 100;
    return supportPercentage;
}

// Example usage
const box = { x: 150, y: 133, width: 150, height: 100 };
const positions = [
    { x: 0, y: 233, width: 200, height: 100 },
    { x: 0, y: 33, width: 150, height: 200 }
];
const binHeight = 300;

const support = measureSupport(box, positions, binHeight);
console.log(`Support for the box is ${support}%`);
