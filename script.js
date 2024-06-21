let globalPackingPositions = [];

// Function to parse input and create array of boxes
function parseBoxes(input) {
    return input.trim().split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => {
            // Replace escaped commas with a unique placeholder
            const placeholder = '__COMMA__';
            line = line.replace(/\\,/g, placeholder);

            const [name, width, height] = line.split(',').map((value, index) => {
                value = value.trim();
                // Restore escaped commas
                value = value.replace(new RegExp(placeholder, 'g'), ',');

                return index === 0 ? value : Number(value);
            });

            return { name, width, height };
        });
}

// Function to handle file upload
function handleFileUpload() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            const fileContent = event.target.result;
            document.getElementById('boxes').value = fileContent;
        };
        reader.readAsText(file);
    } else {
        alert('No file selected.');
    }
}

// Function to create a canvas element with specified dimensions
function createCanvas(binWidth, binHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = binWidth;
    canvas.height = binHeight;
    return canvas;
}

// Function to pack boxes into multiple bins

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


function packBins() {
    const binWidth = parseInt(document.getElementById('bin-width').value);
    const binHeight = parseInt(document.getElementById('bin-height').value);
    const numberOfBins = parseInt(document.getElementById('number-of-bins').value);
    const maxColumns = parseInt(document.getElementById('max-columns').value);
    const boxes = parseBoxes(document.getElementById('boxes').value);

    // Sort boxes by width, then by height in descending order
    // note: doing a basic width sort gives good results *shrug*
    boxes.sort((a, b) => {
        //if (b.width !== a.width) {
            return b.width - a.width;
        //}
       // return b.height - a.height;
    });

    //console.log(boxes);
    const binsContainer = document.getElementById('bins-container');
    binsContainer.innerHTML = ''; // Clear existing bins
    const bins = [];
    
    for (let i = 0; i < numberOfBins; i++) {
        const canvas = createCanvas(binWidth, binHeight);
        binsContainer.appendChild(canvas);
        bins.push(canvas.getContext('2d'));
    }

    const positions = Array(numberOfBins).fill().map(() => []); // Store positions of placed boxes for each bin


    // Define adjusted shades of blue for contrast and readability with black text
    const blueShades = [
        "#B3D9FF", // Light Blue
        "#A3C7FF", // Sky Blue
        "#93B4FF", // Pastel Blue
        "#82A2FF", // Baby Blue
        "#7290FF", // Powder Blue
        "#618DFF", // Cornflower Blue
        "#508BFF", // Cerulean Blue
        "#4682B4", // Steel Blue
        "#3C7AFF", // Light Slate Blue
        "#326EFF", // Slate Blue
        "#295EFF", // Dark Slate Blue
        "#1A4E8D"  // Midnight Blue
    ];

    const errorMessages = []; // Array to store error messages

    boxes.forEach((box,i) => {
        let placed = false;
        
        boxName = (showPackingOrder.checked)? `${i} ${box.name}` : box.name

        for (let binIndex = 0; binIndex < bins.length && !placed; binIndex++) {
            const ctx = bins[binIndex];
            const positionArray = positions[binIndex];

            if(document.getElementById("prioritizeVertical").checked){
                //Try Vertical first
                placed = tryPlaceBox(ctx, positionArray,boxName, box.height, box.width, binWidth, binHeight, true, blueShades[positionArray.length % blueShades.length]);
                //If failed, try placing vertically
                if (!placed) {
                    placed = tryPlaceBox(ctx, positionArray, boxName, box.width, box.height, binWidth, binHeight, false, blueShades[positionArray.length % blueShades.length]);
                }
            }
            else{
                
                placed = tryPlaceBox(ctx, positionArray, boxName, box.width, box.height, binWidth, binHeight, false, blueShades[positionArray.length % blueShades.length]);
                if (!placed) {
                    placed = tryPlaceBox(ctx, positionArray, boxName, box.height, box.width, binWidth, binHeight, true, blueShades[positionArray.length % blueShades.length]);
                }
            }
        }

        if (!placed) {
            errorMessages.push(box.name);
        }
    });

    // If there are error messages, display them in the HTML
    if (errorMessages.length > 0) {
        const errorSummaryElement = document.getElementById('error-summary');
        const errorDetailsElement = document.getElementById('error-details');

        // Display the summary message
        errorSummaryElement.style.display = 'block';
        errorSummaryElement.innerHTML = `<strong>Error:</strong> <button onclick="toggleErrorDetails()">Show items that were not packed</button>`;

        // Clear previous error details
        errorDetailsElement.innerHTML = '';

        // Add detailed error messages
        errorMessages.forEach(msg => {
            const li = document.createElement('li');
            li.textContent = msg;
            errorDetailsElement.appendChild(li);
        });

        // Display the error message container
        document.getElementById('error-message').style.display = 'block';
    } else {
        // Clear any existing error messages if there are none
        document.getElementById('error-summary').innerHTML = '';
        document.getElementById('error-summary').style.display = 'none';
        document.getElementById('error-details').innerHTML = '';
        document.getElementById('error-message').style.display = 'none';
    }

    // Arrange bins in a grid with specified max columns
    binsContainer.style.gridTemplateColumns = `repeat(${Math.min(maxColumns, numberOfBins)}, auto)`;
    const gap = window.getComputedStyle(binsContainer).getPropertyValue('gap').slice(0,-2);
    binsContainer.style.maxWidth = `${maxColumns*binWidth+(maxColumns-1)*gap + 8*2}px`; //the 8*2 is for 4 canvases with 2 pixels of border on left and right
    globalPackingPositions = positions; // Store positions in global variable
    unpackedGames = errorMessages; // Store unpacked games
}


// Function to toggle error details visibility
function toggleErrorDetails() {
    const errorDetailsElement = document.getElementById('error-details');
    const buttonText = document.querySelector('#error-summary button');

    if (errorDetailsElement.style.display === 'none' || errorDetailsElement.style.display === '') {
        errorDetailsElement.style.display = 'block';
        buttonText.textContent = 'Hide details';
    } else {
        errorDetailsElement.style.display = 'none';
        buttonText.textContent = 'Show items that were not packed';
    }
}
function tryPlaceBox(ctx, positionArray, name, width, height, binWidth, binHeight, vertical, shade) {
    let supportThreshold = document.getElementById("support-threshold").value;
    for (let y = binHeight - height; y >= 0; y--) {
        for (let x = 0; x <= binWidth - width; x++) {
            if (canPlaceBox(x, y, width, height, positionArray) && (measureSupport({ x, y, width, height }, positionArray, binHeight) > supportThreshold)) {
                positionArray.push({ x, y, width, height, name }); // Include name in positionArray
                if (ctx) {
                    drawBox(ctx, x, y, width, height, shade);
                    drawText(ctx, name, x, y, width, height, vertical);
                }
                return true;
            }
        }
    }
    return false;
}




// Function to check if the box can be placed at the given position
function canPlaceBox(x, y, width, height, positions) {
    return positions.every(pos =>
        x >= pos.x + pos.width ||
        x + width <= pos.x ||
        y >= pos.y + pos.height ||
        y + height <= pos.y
    );
}

// Function to draw text inside the box with trimming if necessary, considering orientation
function drawText(ctx, text, x, y, width, height, vertical) {
    ctx.save();
    ctx.translate(x, y);
    
    if (vertical) {
        ctx.translate(width / 2, height / 2); // Move origin to center of the box
        ctx.rotate(-Math.PI / 2); // Rotate text
    }
    
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    
    // Measure the width of the text
    const textWidth = ctx.measureText(text).width;
    
    // Adjust the text if it exceeds the box dimensions
    if (vertical) {
        const trimmedText = trimTextToFit(ctx, text, height); // Trim text to fit the box height
        const textX = 0; // Center horizontally for vertical boxes
        const textY = 0; // Center vertically for vertical boxes
        ctx.fillText(trimmedText, textX, textY); // Draw trimmed text
    } else {
        const trimmedText = trimTextToFit(ctx, text, width); // Trim text to fit the box width
        const textX = width / 2; // Center horizontally for horizontal boxes
        const textY = height / 2; // Center vertically for horizontal boxes
        ctx.fillText(trimmedText, textX, textY); // Draw trimmed text
    }
    
    ctx.restore();
}

// Function to trim the text to fit within the specified dimension (width or height) based on orientation
function trimTextToFit(ctx, text, maxDimension) {
    let trimmedText = text;
    let textWidth = ctx.measureText(trimmedText).width;

    while (textWidth > maxDimension && trimmedText.length > 0) {
        trimmedText = trimmedText.slice(0, -1); // Remove one character from the end
        textWidth = ctx.measureText(trimmedText).width; // Measure width without ellipsis
    }

    return trimmedText;
}

// Function to draw the box with a gradient fill and outline
function drawBox(ctx, x, y, width, height, shade) {
    ctx.save();

    // Draw filled rectangle with shade of blue
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);

    // Draw outline (adjusted to stay within the dimensions of the box)
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

    ctx.restore();
}

function generateArrangementText(positions) {
    let text = '';
    const binHeight = parseInt(document.getElementById('bin-height').value);

    positions.forEach((positionArray, binIndex) => {
        text += `Bin ${binIndex + 1}:\n`;
        positionArray.forEach(box => {
            //origin is top left of bin
            //text += `  Box [${box.name}]: x=${box.x}, y=${box.height}, width=${box.width}, height=${box.height}\n`;
            
            //transposed so (x,y)=(0,0) corresponds to the bottom left of the bin
            text += `  Box [${box.name}]: x=${box.x}, y=${Math.abs(box.y+box.height-binHeight)}, width=${box.width}, height=${box.height}\n`;
            
        });
        text += '\n';
    });
    if (unpackedGames.length > 0) {
        text += 'Unpacked Games:\n';
        unpackedGames.forEach(game => {
            text += `  ${game}\n`;
        });
    }
    return text;
}

function downloadArrangement() {
    if (globalPackingPositions.length === 0) {
        alert('No packing arrangement available. Please pack the bins first.');
        return;
    }

    const arrangementText = generateArrangementText(globalPackingPositions);
    const blob = new Blob([arrangementText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'bin_arrangement.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}




// Initial packBins() call when the page loads
window.onload = function() {
    document.getElementById('boxes').value = sampleBoxes; //sampleBoxes in boxes.js
    packBins();
};