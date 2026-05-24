import fetch from "node-fetch";

export async function init () {
    await Avatar.lang.addPluginPak('TimeDate');
}

export async function action(data, callback) {

	const L = await Avatar.lang.getPak('TimeDate', data.language);

	try {
		
		const tblActions = {
			getHour : () => getHour(data, data.client, L),
			getDay : () => getDay(data.client, L)			
		}
		
		info("TimeDate:", data.action.command, L.get("plugin.from"), data.client);
			
		if (tblActions[data.action.command]) {
            await tblActions[data.action.command]();
        }

	} catch (err) {
		if (data.client) Avatar.Speech.end(data.client);
		if (err.message) error(err.message);
	}	
		
	callback();
 
}


const getTimezoneFromCity = async (city) => {

    try {

        const geoRes = await fetch(
            `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
        );

        const geoData = await geoRes.json();

        if (!geoData.results?.length) return null;

        return geoData.results[0].timezone;

    } catch (err) {
        error("Geo API error:", err.message);
        return null;
    }
};

const getLocalTime = (timezone) => {

    const now = new Date();

    return {
        time: new Intl.DateTimeFormat("fr-FR", {
            timeZone: timezone,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }).format(now),

        date: new Intl.DateTimeFormat("fr-FR", {
            timeZone: timezone,
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        }).format(now)
    };
};

const getHour = async (data, client, L) => {

    try {

        let town = Config.modules.TimeDate.town;

        const sentence = (data.rawSentence || data.action.sentence || "").toLowerCase();

        const match = sentence.match(/(?:heure\s*(?:à|a|de)\s+)(.+)$/i);

        if (match?.[1]) town = match[1].trim();

        let timezone = Intl.supportedValuesOf("timeZone")
            .find(tz => tz.toLowerCase().includes(town.toLowerCase().replace(/ /g, "_")));

        if (!timezone) {
            timezone = await getTimezoneFromCity(town);
        }

        if (!timezone) {
            return Avatar.speak(L.get(["speech.unknownTown", town]), client);
        }

        const { time, date } = getLocalTime(timezone);

        Avatar.speak(L.get(["speech.hour", time, town]), client, () => Avatar.Speech.end(client));

    } catch (err) {
        error(err.message);
        Avatar.speak(L.get("speech.errorHttp", town), client);
    }
};


const getDay = async (client, L) => {

    try {

        const timezone = "Europe/Paris";

        const { date } = getLocalTime(timezone);

        Avatar.speak(L.get("speech.day", date), client, () => Avatar.Speech.end(client)
        );

    } catch (err) {
        error(err.message);
        Avatar.speak(L.get("speech.errorAccess"), client);
    }
};
