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

function packBins() {
    const binWidth = parseInt(document.getElementById('bin-width').value);
    const binHeight = parseInt(document.getElementById('bin-height').value);
    const numberOfBins = parseInt(document.getElementById('number-of-bins').value);
    const maxColumns = parseInt(document.getElementById('max-columns').value);
    const boxes = parseBoxes(document.getElementById('boxes').value);

    // Sort boxes by width, then by height in descending order
    boxes.sort((a, b) => {
        if (b.width !== a.width) {
            return b.width - a.width;
        }
        return b.height - a.height;
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

    boxes.forEach(box => {
        let placed = false;

        for (let binIndex = 0; binIndex < bins.length && !placed; binIndex++) {
            const ctx = bins[binIndex];
            const positionArray = positions[binIndex];

            if(document.getElementById("prioritizeVertical").checked){
                //Try Vertical first
                placed = tryPlaceBox(ctx, positionArray, box.name, box.height, box.width, binWidth, binHeight, true, blueShades[positionArray.length % blueShades.length]);
                //If failed, try placing vertically
                if (!placed) {
                    placed = tryPlaceBox(ctx, positionArray, box.name, box.width, box.height, binWidth, binHeight, false, blueShades[positionArray.length % blueShades.length]);
                }
            }
            else{
                
                placed = tryPlaceBox(ctx, positionArray, box.name, box.width, box.height, binWidth, binHeight, false, blueShades[positionArray.length % blueShades.length]);
                if (!placed) {
                    placed = tryPlaceBox(ctx, positionArray, box.name, box.height, box.width, binWidth, binHeight, true, blueShades[positionArray.length % blueShades.length]);
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


// Function to attempt placing a box in the specified orientation

function tryPlaceBox(ctx, positionArray, name, width, height, binWidth, binHeight, vertical, shade) {
    //for (let y = binHeight - height; y >= 0; y--) {
    for (let y = binHeight - height; y >= 0; y--) {
        for (let x = 0; x <= binWidth - width; x++) {
            if (canPlaceBox(x, y, width, height, positionArray)) {
                
                positionArray.push({ x, y, width, height });
                drawBox(ctx, x, y, width, height, shade); // Draw box with shade
                drawText(ctx, name, x, y, width, height, vertical); // Pass name to drawText
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

// Initial packBins() call when the page loads
window.onload = function() {
    // Prepopulate the box input with default values
    document.getElementById('boxes').value =
    `test1,200,100
test2,150,200
test3,150,100`;
    /*
    `Downforce,295,42
Africana,295,73
Cleopatra and the Society of Architects,295,73
Ticket to Ride Europe,295,73
Five Tribes,295,73
Port Nigra,295,88
Magic Dominaria,295,70
Bring Out Yer Dead,295,80
Camel Up,295,73
Zhan Guo,295,73
Subdivision,295, 73
A Study In Emerald,295, 73
Mombasa,295,73
Adventureland,295,70
Oceanos,295,75
New York 1901,295,73
Inkognito,295,73
Rondo,295,73
Aquileia,295,73
Manila,295,73
A Castle for All Seasons,295,73
Mangrovia,295,73
Aquarium,154,37
Blueprints,154,37
More Cash n' More Guns,140,56
Team Spirit,140,56
Colossal Arena (2004 ed),200,40
Fangs,130,40
The Crew: The Quest for Planet Nine,130,40
CoB: Card Game,112, 36
Cob: Dice Game,112, 36
The Golden City,295,73
The Secret of Monte Cristo,295,73
Trolhalla,295, 73
North Wind,295,73
Atlas: Enchanted Lands,130,40
Fungi,130,40
Gravwell (2nd ed),242, 78
Discoveries: The Journals of Lewis and Clark,276, 57
Transamerica,270, 68
Battle Sheep,265,63
Cash n' Guns (2nd ed),295, 58
Sanssouci,295, 73
Meadow,295, 75
Asara,295, 73
Orongo,295, 73
Modern Art (cmon ed),295,52
Kingdoms,255,52
Red November,255,50
The LotR (FF ed),255, 52
Gateway Uprising,255, 52
King of New York,255, 70
Through the Desert (1st ed),255, 52
Shinobi Wat-Aah!,255,70
Infiltration,255, 52
Rune Age,255, 52
Bob Ross: The Art of Chill,265,52
Key to the Kingdom,295, 70
Around the World in 80 Days,295, 73
Steam Time,295, 73
Mercado,295, 73
Biblios,138, 42
Pyramids,138,42
Fox in Forest,114,32
Fox in Forest Duet,114,32
#========Added recently
Ankh'or,130,40
7 Wonders Duel,205,52
Boomtown,200,52
Point Salad,145,48
Laterns: The Harvest Festival,185,52
Tiny Epic Galaxies Blast Off!,120,40
Targi,204,48
Spynet,116,34
Mystic Market,160,54
Under Falling Skies,185,58
Crypt,80,36
Ciub,190,68
Nightfall,200,82
Nightfall: The Coldest War,200,82
Nightfall: Martial Law,200,82
Starfighter,190,60
Citadels (old),104,37
Colossal Arena (new),104,37
Jaipur (1st ed),104,37
TSCHAK!,104,37
Kill the Overlord,110,42
Secrets,104,37
Air\\, Land\\, and\\, Sea Critters at War,114,40
Seven7s,110,33
Red 7,108,22
Pocket Mars,100,30
BANG! Dice: Old Saloon,90,33
Fairy Tile,206,60
Pickomino,202,52
Aton, 192,74
Arena: Roma II, 192,74
Blokus Duo,207,43
Jambo,202,32
Morels,204,32
Monster Expedition,202,52
Lost Cities (1st ed),200,33
Watergate,202,48
Prowler's Passage,230,52
VivaJava Dice,223,52
Piece o' Cake,166,59`;*/

    // Automatically pack bins on page load
    packBins();
};