let globalPackingPositions = [];
let nextBoxId = 0; // Initialize a counter for assigning unique IDs to boxes
// Define a global array to keep track of packed box IDs across all sections
let packedBoxIds = [];


// Utility function to create a canvas element
function createCanvas(binWidth, binHeight) {
    const canvas = document.createElement('canvas');
    canvas.width = binWidth;
    canvas.height = binHeight;
    return canvas;
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


// Function to parse bin sizes from textarea
function parseBinSizes(input) {
    const binSizesText = input.trim();
    const lines = binSizesText.split('\n');

    const binSizes = lines.map(line => {
        const [label,width, height, numberOfBins, columns] = line.split(',').map((item,i)=> {
            if(i)
                return parseInt(item.trim())
            else 
                return item.trim();
        } );
        if(numberOfBins>25){
            alert("max bins = 25");
            throw new Error("validation error: Exceeded Max Bins");
        } 
        return { label,width, height, numberOfBins, columns };
    });
    return binSizes;
}

// Function to parse input and create an array of boxes
function parseBoxes(input) {
    return input.trim().split('\n')
        .filter(line => line.trim() && !line.trim().startsWith('#'))
        .map(line => {
            const placeholder = '__COMMA__';
            line = line.replace(/\\,/g, placeholder);

            const [name, width, height, itemType] = line.split(',').map((value, index) => {
                value = value.trim();
                value = value.replace(new RegExp(placeholder, 'g'), ',');

                return (index === 0 || index === 3) ? value : Number(value);
            });
            const id = nextBoxId++; // Assign a unique ID to each box
            return { id, name, width, height, itemType };
        });
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

// Function to measure support for the box
function measureSupport(box, positions, binHeight) {
    let supportedWidth = 0;
    const boxBottom = box.y + box.height;

    if (boxBottom >= binHeight) {
        supportedWidth = box.width;
    } else {
        positions.forEach(pos => {
            const posTop = pos.y;
            const posBottom = pos.y + pos.height;

            if (posTop === boxBottom) {
                const overlapStart = Math.max(box.x, pos.x);
                const overlapEnd = Math.min(box.x + box.width, pos.x + pos.width);
                const overlapWidth = Math.max(0, overlapEnd - overlapStart);
                supportedWidth += overlapWidth;
            }
        });

        supportedWidth = Math.min(supportedWidth, box.width);
    }

    const supportPercentage = (supportedWidth / box.width) * 100;
    return supportPercentage;
}

// Function to draw the box with a gradient fill and outline
function drawBox(ctx, x, y, width, height, shade) {
    ctx.save();
    ctx.fillStyle = shade;
    ctx.fillRect(x, y, width, height);
    
    
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + ctx.lineWidth / 2, y + ctx.lineWidth / 2, width - ctx.lineWidth, height - ctx.lineWidth);

    ctx.restore();
}

// Function to trim text to fit within the specified dimension
function trimTextToFit(ctx, text, maxDimension) {
    let trimmedText = text;
    let textWidth = ctx.measureText(trimmedText).width;

    while (textWidth > maxDimension && trimmedText.length > 0) {
        trimmedText = trimmedText.slice(0, -1);
        textWidth = ctx.measureText(trimmedText).width;
    }

    return trimmedText;
}

// Function to draw text inside the box
function drawText(ctx, text, x, y, width, height, vertical) {
    
    ctx.save();
    ctx.translate(x, y);

    if (vertical) {
        ctx.translate(width / 2, height / 2);
        ctx.rotate(-Math.PI / 2);
    }

    ctx.font = "15px Arial Narrow";
    //if(vertical)
        ctx.textAlign = "center"; 
    ctx.textBaseline = "middle";

    
    const maxDimension = vertical ? height : width;
    const textPadding = Math.min(15, maxDimension/10);
    const trimmedText = trimTextToFit(ctx, text, maxDimension -textPadding);

    const textX = vertical ? 0 : width / 2;
    const textY = vertical ? 0 : height / 2;
    ctx.fillText(trimmedText, textX, textY);

    ctx.restore();
}

// Function to attempt placing a box in the bin
function tryPlaceBox(ctx, positionArray, name, width, height, binWidth, binHeight, vertical,forceToBottom, shade, supportThreshold) {
    for (let x = 0; x <= binWidth - width; x+=1) {
        for (let y = binHeight - height; y >= 0; y-=1) {
            if (canPlaceBox(x, y, width, height, positionArray) && (measureSupport({ x, y, width, height }, positionArray, binHeight) > supportThreshold)) {
                positionArray.push({ x, y, width, height, name });
                if (ctx) {
                    drawBox(ctx, x, y, width, height, shade);
                    drawText(ctx, name, x, y, width, height, vertical);
                }
                return true;
            }
            if(forceToBottom) //this item can only place on bottom of bin
                break;
        }
    }
    return false;
}

// Function to pack boxes into bins
function packBins() {
    const supportThreshold = parseInt(document.getElementById('support-threshold').value);
    const allowVertical = document.getElementById("allowVertical").checked;
    const showPackingOrder = document.getElementById("showPackingOrder").checked;
    const boxes = parseBoxes(document.getElementById('boxes').value);

    boxes.sort((a, b) => {
        if(b.width !== a.width){
            return b.width - a.width;
        }
        //else if (b.height !== a.height)
          return b.height - a.height;
        // else
        //   return b.width*b.height - a.width* a.height
    });

    const binSections = parseBinSizes(document.getElementById('bin-sections').value); // Parse bin sizes from textarea
    const binsContainer = document.getElementById('bins-container');
    binsContainer.innerHTML = '';
    const errorMessages = [];
    globalPackingPositions = [];
    
    //Blue shades
    const shades = [
        "#B3D9FF", "#A3C7FF", "#93B4FF", "#82A2FF", "#7290FF",
        "#618DFF", "#508BFF", "#4682B4", "#3C7AFF", "#326EFF",
        "#295EFF", "#1A4E8D"
    ];

    binSections.forEach((binSection, sectionIndex) => {
        const { label, width: binWidth, height: binHeight, numberOfBins, columns: maxColumns } = binSection;
        const sectionDiv = document.createElement('div');
        sectionDiv.classList.add('bin-section');
        
        const sectionLabelH2 = document.createElement('h2');
        sectionLabelH2.innerText = label;
        binsContainer.appendChild(sectionLabelH2);

        binsContainer.appendChild(sectionDiv);

        const sectionBins = [];
        const sectionPositions = Array.from({ length: numberOfBins }, () => []);

        
        for (let i = 0; i < numberOfBins; i++) {
            const canvas = createCanvas(binWidth, binHeight);
            sectionDiv.appendChild(canvas);
            sectionBins.push(canvas.getContext('2d'));
        }

        boxes.forEach((box, i) => {
            const { id, name, width, height, itemType} = box;

            if (!packedBoxIds.includes(id)) {
                let placed = false;
                const boxName = showPackingOrder ? `${i} ${name}` : name;

                for (let binIndex = 0; binIndex < sectionBins.length && !placed; binIndex++) {
                    const ctx = sectionBins[binIndex];
                    const positionArray = sectionPositions[binIndex];
                    const shade = shades[positionArray.length % shades.length];

                    if(itemType == 'binder' || itemType=='book'){
                        placed = tryPlaceBox(ctx, positionArray, boxName, width,height, binWidth, binHeight, true,true, shade, supportThreshold);
                    }
                    else {
                        placed = tryPlaceBox(ctx, positionArray, boxName, width, height, binWidth, binHeight, false,false, shade, supportThreshold);
                        if(!placed && allowVertical && (positionArray.length > 0)) //first box pack as Horizontal to avoid ugly packs
                            tryPlaceBox(ctx, positionArray, boxName, height, width, binWidth, binHeight, true,false, shade, supportThreshold);
                        
                    }
                }

                if (placed) {
                    packedBoxIds.push(id); // Add the box ID to the global packedBoxIds array
                } else {
                    errorMessages.push(boxName); // Add to error messages if box couldn't be placed
                }
            }
        });

        handleErrors(errorMessages);
        
        arrangeBins(sectionDiv, numberOfBins, binWidth, maxColumns);
        globalPackingPositions.push({ binHeight, binWidth, sectionPositions,label });

        errorMessages.length = 0; // Clear error messages for the next section
    });
}


// Function to arrange bins in a section
function arrangeBins(sectionDiv, numberOfBins, binWidth, maxColumns) {
 
    const columnCount = Math.min(numberOfBins, maxColumns);
    sectionDiv.style.gridTemplateColumns = `repeat(${columnCount}, ${binWidth}px)`;
    //sectionDiv.style.gridTemplateColumns = `repeat(${columnCount}, 1fr)`;
}    

// Function to handle error messages
function handleErrors(errorMessages) {
    if (errorMessages.length > 0) {
        const errorSummaryElement = document.getElementById('error-summary');
        const errorDetailsElement = document.getElementById('error-details');

        errorSummaryElement.style.display = 'block';
        errorSummaryElement.innerHTML = `<strong>Error:</strong> <button onclick="toggleErrorDetails()">Show ` + errorMessages.length +` items that were not packed</button>`;
        errorDetailsElement.innerHTML = '';
        errorMessages.forEach(msg => {
            const li = document.createElement('li');
            li.textContent = msg;
            errorDetailsElement.appendChild(li);
        });

        document.getElementById('error-message').style.display = 'block';
    } else {
        document.getElementById('error-summary').innerHTML = '';
        document.getElementById('error-summary').style.display = 'none';
        document.getElementById('error-details').innerHTML = '';
    }
}


// Function to generate arrangement text
function generateArrangementText() {
    let arrangementText = '';
    
    
    //info for user
    arrangementText = "Format:\n";
    arrangementText += `Section <#>/<count> "<name>":\n`;
    arrangementText += `    Bin <#>/<count> (<binWidth> x <binHeight>)\n`;
    arrangementText += `        <box name> (<x>,<y>)....\n\n`;
    //end info
    

    globalPackingPositions.forEach((section, sectionIndex,sectionArr) => {

        arrangementText += `====================================================\n`;
        arrangementText += `Section [${sectionIndex + 1}/${sectionArr.length}]: "${section.label}"\n`;

        let binWidth = section.binWidth;
        let binHeight = section.binHeight;
        
        section.sectionPositions.forEach((bin, binIndex, binArr) => {
            arrangementText += `    Bin [${binIndex + 1}/${binArr.length}] (${binWidth}x${binHeight}):\n`;
            bin.forEach(box => {
                arrangementText += `        ${box.name} (${box.x},${binHeight-box.y-box.height})\n`;
                
            });

            arrangementText += '\n';
        });

        arrangementText += '\n';
    });


    let errors = document.getElementById('error-details');

    if (errors.children.length > 0) {
        arrangementText += `====================================================\n`;
        arrangementText += `Unpacked Items (${errors.children.length}):\n`;
        for(let i=0;i<errors.children.length;i++)
            arrangementText += `${errors.children[i].textContent}\n`;
    }

    return arrangementText;
}



// Function to download the arrangement as a text file
function downloadArrangement() {
    const arrangementText = generateArrangementText();
    const blob = new Blob([arrangementText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'bin_arrangement.txt';
    link.click();
}

// Function to toggle error details
function toggleErrorDetails() {
    const errorDetailsElement = document.getElementById('error-details');
    const isVisible = errorDetailsElement.style.display !== 'none';
    errorDetailsElement.style.display = isVisible ? 'none' : 'block';
}

function updateStatus(msg=false){
    document.getElementById("status").innerText = msg ? msg: "";
}



// Initial packBins() call when the page loads
window.onload = function() {
    document.getElementById('bin-sections').value = sampleShelves; //sampleBoxes in boxes.js
    document.getElementById('boxes').value = sampleBoxes; //sampleBoxes in boxes.js
    //packBins();
};