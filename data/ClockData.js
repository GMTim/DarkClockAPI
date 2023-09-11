import SQLiteCRUD from "./SqliteCRUD.js"

/**
 * @typedef {Object} SiteClocks
 * @property {string} id - The unique identifier for the website.
 * @property {string} name - The name or URL of the website.
 * @property {ClockGroup[]} clockGroups - Groups of related Clocks.
 */

/**
 * @typedef {Object} ClockGroup
 * @property {string} id - The unique identifier for the group.
 * @property {string} website_id - The ID of the associated website.
 * @property {string} title - The title or name of the group.
 * @property {Clock[]} clocks - Clocks that belong to the group.
 */

/**
 * @typedef {Object} Clock
 * @property {string} id - The unique identifier for the data.
 * @property {string} group_id - The ID of the associated group.
 * @property {string} title - The title or name of the data.
 * @property {number} totalSegments - The total number of segments.
 * @property {number} filledSegments - The number of filled segments.
 * @property {string} color
 */

const Tables = {
    siteClocks: "SiteClocks",
    clockGroups: "ClockGroups",
    clocks: "Clocks"
}

class ClockData {
    constructor() {
        this.crud = new SQLiteCRUD("./data/clockdata.sqlite")
    }
    /** @returns {Promise<ClockData>} */
    async checkForTables() {
        try {
            await this.crud.createTable("SiteClocks", {
                id: 'TEXT PRIMARY KEY',
                name: 'TEXT NOT NULL'
            })
            await this.crud.createTable("ClockGroups", {
                id: 'TEXT PRIMARY KEY',
                website_id: 'TEXT',
                title: 'TEXT NOT NULL'
            })
            await this.crud.createTable("Clocks", {
                id: 'TEXT PRIMARY KEY',
                group_id: 'TEXT',
                title: 'TEXT NOT NULL',
                totalSegments: 'INTEGER',
                filledSegments: 'INTEGER',
                color: 'TEXT'
            })
            await this.crud.ensureColumnExists("Clocks", "color", "TEXT", "green")
        } catch (error) {
            console.log(error)
        }
        return this
    }
    /** @returns {SiteClocks[]} */
    async getSites() {
        const sites = await this.crud.select(Tables.siteClocks)
        return sites
    }
    /** @returns {SiteClocks}  */
    async get(site_id) {
        const data = {id: site_id}
        let site = await this.getSite(data)
        site.clockGroups = await this.getClockGroups(data)
        for (const index in site.clockGroups) {
            delete site.clockGroups[index].website_id
            site.clockGroups[index].clocks = await this.getClocks(site.clockGroups[index])
            site.clockGroups[index].clocks.forEach(c => delete c.group_id)
        }
        return site
    }
    /** @param {SiteClocks} data */
    async insert(data) {
        data = this.sanitizeIds(data)
        await this.crud.beginTransaction()
        await this.insertSite(data)
        await this.insertGroups(data)
        await this.insertClocks(data)
        await this.crud.commitTransaction()
    }
    /**
     * @private
     * @param {SiteClocks} data
     * @returns {SiteClocks}
     */
    sanitizeIds(data) {
        data.id = data.id.toLowerCase()
        for (const gi in data.clockGroups) {
            data.clockGroups[gi].id = data.clockGroups[gi].id.toLowerCase()
            for (const ci in data.clockGroups[gi].clocks) {
                data.clockGroups[gi].clocks[ci].id = data.clockGroups[gi].clocks[ci].id.toLowerCase()
            }
        }
        return data
    }
    /** 
     * @private
     * @param {SiteClocks} data
     * @returns {SiteClocks}
     */
    async getSite(data) {
        return (await this.crud.select(Tables.siteClocks, {id: data.id}))[0]
    }
    /** 
     * @private
     * @param {SiteClocks} data
     * @returns {ClockGroup[]}
     */
    async getClockGroups(data) {
        return (await this.crud.select(Tables.clockGroups, {website_id: data.id}))
    }
    /** 
     * @private
     * @param {ClockGroup} data
     * @returns {Clock[]}
     */
    async getClocks(data) {
        return (await this.crud.select(Tables.clocks, {group_id: data.id}))
    }
    /**
     * @private
     * @param {SiteClocks} data
     */
    async insertSite(data) {
        let dbData = await this.getSite(data)
        if (!dbData) {
            await this.crud.insert(Tables.siteClocks, {
                id: data.id,
                name: data.name
            })
        } else if (data.name != dbData.name) {
            await this.crud.update(Tables.siteClocks, {
                name: data.name
            }, {
                id: data.id
            })
        }
    }
    /**
     * @private
     * @param {SiteClocks} data
     */
    async insertGroups(data) {
        let dbData = await this.getClockGroups(data)
        let removeGroups = dbData.map(a => a.id).filter(a => !data.clockGroups.map(b => b.id).includes(a))
        for (const group of removeGroups) {
            await this.crud.delete(Tables.clocks, {group_id: group})
            await this.crud.delete(Tables.clockGroups, {id: group})
        }
        for (let group of data.clockGroups) {
            group.website_id = data.id
            const dbGroup = dbData.filter(g => g.id == group.id)[0]
            if (!dbGroup) {
                await this.crud.insert(Tables.clockGroups, {
                    id: group.id,
                    website_id: group.website_id,
                    title: group.title
                })
            } else if (group.title != dbGroup.title) {
                await this.crud.update(Tables.clockGroups, {
                    title: group.title
                }, {
                    id: group.id
                })
            }
        }
    }
    /**
     * @private
     * @param {SiteClocks} data
     */
    async insertClocks(data) {
        for (const group of data.clockGroups) {
            let dbData = await this.getClocks(group)
            let removeClocks = dbData.map(a => a.id).filter(a => !group.clocks.map(b => b.id).includes(a))
            for (const clock of removeClocks) {
                await this.crud.delete(Tables.clocks, {id: clock})
            }
            for (let clock of group.clocks) {
                clock.group_id = group.id
                const dbClock = dbData.filter(g => g.id == clock.id)[0]
                if (!dbClock) {
                    await this.crud.insert(Tables.clocks, {
                        id: clock.id,
                        group_id: clock.group_id,
                        title: clock.title,
                        totalSegments: clock.totalSegments,
                        filledSegments: clock.filledSegments,
                        color: clock.color
                    })
                } else if (clock.title != dbClock.title ||
                    clock.filledSegments != dbClock.filledSegments ||
                    clock.totalSegments != dbClock.totalSegments ||
                    clock.color != dbClock.color) {
                    await this.crud.update(Tables.clocks, {
                        title: clock.title,
                        totalSegments: clock.totalSegments,
                        filledSegments: clock.filledSegments,
                        color: clock.color
                    }, {
                        id: clock.id
                    })
                }
            }
        }
    }
    close() {
        this.crud.close()
    }
}

export default ClockData