import fetch from "node-fetch";

export async function action(data, callback) {

	try {
		
		const tblActions = {
			getHour : () => getHour(data, data.client),
			getDay : () => getDay(data.client)			
		}
		
		info("TimeDate:", data.action.command, L.get("plugin.from"), data.client);
			
		await tblActions[data.action.command]()

	} catch (err) {
		if (data.client) Avatar.Speech.end(data.client);
		if (err.message) error(err.message);
	}	
		
	callback();
 
}

const getHour = async (data, client) => {
	let town = "Paris";

	try {
		const sentence = (data.rawSentence || data.action.sentence || "").toLowerCase();

		const match = sentence.match(/(?:heure\s*(?:à|a|de)\s+)(.+)$/i);
		if (match?.[1]) town = match[1].trim();

		// 🌍 GEOLOCALISATION
		const geoRes = await fetch(
			`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(town)}&count=1`
		);

		const geoData = await geoRes.json();

		if (!geoData.results?.length) {
			return Avatar.speak(`Je ne trouve pas la ville ${town}`, client);
		}

		const { name, timezone } = geoData.results[0];

		// 🕒 API heure fiable (fallback)
		let timeData;

		try {
			const res = await fetch(`https://worldtimeapi.org/api/timezone/${timezone}`);
			timeData = await res.json();
		} catch {
			const res = await fetch(`https://timeapi.io/api/Time/current/zone?timeZone=${timezone}`);
			timeData = await res.json();
		}

		const date = new Date(timeData.datetime || timeData.dateTime);

		const heure = date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit"
		});

		Avatar.speak(`Il est ${heure} à ${name}`, client);

	} catch (err) {
		error(err.message);
		Avatar.speak(`Je ne trouve pas l'heure pour ${town}`, client);
	}
};

const getDay = (client) => {
	try {
		const date = new Date();

		const formatted = date.toLocaleDateString("fr-FR", {
			weekday: "long",
			day: "numeric",
			month: "long",
			year: "numeric"
		});

		Avatar.speak(`Aujourd’hui, nous sommes le ${formatted}`, client);

		return formatted;

	} catch (err) {
		error(err.message);
		Avatar.speak("Impossible de récupérer la date", client);
	}
};
