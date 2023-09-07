import ClockData from "./data/ClockData.js"

/** @type {import("./data/ClockData.js").SiteClocks} */
const tempData = {
    id: "e3647b84-d25f-4dee-a0cc-dcfcd3f1b5bb",
    name: "bunchofbull.net",
    clockGroups: [{
        id: "91f661a8-d4fa-4e6f-a5e9-2f260bf85899",
        title: "Blamo",
        clocks: [{
            id: "35f1589b-ab3e-4417-b2d7-29d63acca2f7",
            title: "Clock",
            totalSegments: 8,
            filledSegments: 4
        }]
    }]
}

let cd = await (new ClockData()).checkForTables()
await cd.insert(tempData)

let site = await cd.get("e3647b84-d25f-4dee-a0cc-dcfcd3f1b5bb")
console.log(JSON.stringify(site))
await cd.crud.close()