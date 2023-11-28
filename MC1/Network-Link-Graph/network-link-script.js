// Processing the data type to maintain uniformity
function processDataType(d) {
    for (var i = 0; i < d.length; i++) {
        d[i]['impOfPeople'] = parseFloat(d[i]['impOfPeople']);
        d[i]['impOforganization'] = parseFloat(d[i]['impOforganization']);
        d[i]['clusterSize'] = parseFloat(d[i]['clusterSize']);
    }
    return d;
}

// Grouping the nodes (people) in terms of their respective organization
function groupByOrganization(d) {
    const organizationClusters = [];
    d.forEach(element => {
        if (!organizationClusters[element.organization]) {
            organizationClusters[element.organization] = [];
        }
        organizationClusters[element.organization].push(element);
    });
    return organizationClusters;
}

// Function to clean the 'source' attribute in linksData
function cleanLinksData(linksData) {
    return linksData.map(d => ({
        source: cleanSourceAttribute(d.source),
        target: cleanSourceAttribute(d.target),
        frequency: d.frequency
    }));
}

// Function to clean the 'source' attribute (remove spaces and special characters)
function cleanSourceAttribute(source) {
    // Replace spaces and special characters with underscores, you can modify this based on your specific requirements
    return source.replace(/[^\w]/g, '');
}

// Loading the data
document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
        d3.csv('Resume-Data.csv'),
        d3.csv('links.csv') // Load links data from the CSV file
    ]).then(function (values) {
        const resumeData = processDataType(values[0]);
        const nodeGroups = groupByOrganization(resumeData);
        const linksData = cleanLinksData(values[1]);
        console.log(resumeData);
        console.log(nodeGroups);
        console.log(linksData);
        plotClusters(resumeData, nodeGroups, linksData);
    });
});



function plotClusters(resumeData, nodeGroups, linksData) {
    console.log(linksData);

    const margin = { top: 50, right: 30, bottom: 120, left: 60 },
        width = 750 - margin.left - margin.right,
        height = 750 - margin.top - margin.bottom;

    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    const svg = d3.select("#plotSvg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const tooltip = d3.select("#plotDiv")
        .append("div")
        .attr("class", "d3-tooltip");

    // Function to compute dynamic attributes for main circles
    const getcirclePositionAttributes = (organization) => {
        const pentagonRadius = 280; // Adjust the radius as needed
        const angleOffset = Math.PI / 2; // Offset to start the pentagon from the top
        const angleStep = (2 * Math.PI) / 5; // Angle between vertices

        const positions = {
            'POKMember': { angle: 0 },
            'GASTechCommittee': { angle: angleStep },
            'GASTechBoard': { angle: 2 * angleStep },
            'GASTechEmployee': { angle: 3 * angleStep },
            'POKCommittee': { angle: 4 * angleStep },
        };

        return {
            cx: 0.5 * width + pentagonRadius * Math.cos(angleOffset + positions[organization].angle),
            cy: 0.5 * height + pentagonRadius * Math.sin(angleOffset + positions[organization].angle),
            r: 70, // Adjust the radius as needed
        };
    };

    // Create a force simulation for the smaller circles
    const simulation = d3.forceSimulation(resumeData)
        .force("x", d3.forceX().strength(0.05).x(d => {
            const organization = d.organization;
            const circlePosition = getcirclePositionAttributes(organization);
            return circlePosition.cx; // Use the main circle's attributes directly
        }))
        .force("y", d3.forceY().strength(0.05).y(d => {
            const organization = d.organization;
            const circlePosition = getcirclePositionAttributes(organization);
            return circlePosition.cy; // Use the main circle's attributes directly
        }))
        .force("collide", d3.forceCollide().radius(d => (d.impOfPeople / 9) * 20 + 9))
        .on("tick", () => {
            circles.attr("cx", d => d.x)
                .attr("cy", d => d.y);
        });

    // Create smaller circles inside the main circles
    const circles = svg.selectAll(".node")
        .data(resumeData)
        .enter().append("circle")
        .attr("class", "node")
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("fill", d => colorScale(d.organization))
        .attr("r", d => ((d.impOfPeople + 2) / 9) * 20)
        .on("mouseover", function (event, d) {
            // Fade all other elements
            svg.selectAll(".link")
                .transition()
                .style("opacity", link => (link.source === d || link.target === d) ? 1 : 0.1);

            circles.transition()
                .style("opacity", node => (node === d) ? 1 : 0.1);

            // Show tooltip on mouseover
            tooltip.html(`Name: ${d.name} <br>Role: ${d.role} <br>Organization: ${d.organization}`)
                .style("opacity", 0.9)
                .style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mousemove", function (event) {
            // Move tooltip with the mouse
            tooltip.style("left", (event.pageX + 15) + "px")
                .style("top", (event.pageY - 15) + "px");
        })
        .on("mouseout", function () {
            // Restore opacity on mouseout
            svg.selectAll(".link")
                .transition()
                .style("opacity", 1);

            circles.transition()
                .style("opacity", 1);

            // Hide tooltip on mouseout
            tooltip.html("")
                .style("opacity", 0);
        });
}
