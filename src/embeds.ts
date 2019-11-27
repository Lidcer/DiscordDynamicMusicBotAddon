import { RichEmbed, TextChannel, Message } from 'discord.js';

export class Embeds {

	static infoEmbed(msg: string, title = 'Info') {
		const embed = basicEmbed();
		embed.setColor('GOLD');
		embed.addField(title, msg);
		return embed;
	}

	static errorEmbed(msg: string, title = 'Info') {
		const embed = basicEmbed();
		embed.setColor('RED');
		embed.addField(title, msg);
		return embed;
	}

}

function basicEmbed() {
	const embed = new RichEmbed();
	embed.setTimestamp(Date.now());
	return embed;
}

export function errorInfo(channel: TextChannel, content: string, deleteNumber?: number): Promise<Message | Message[]> {
	return new Promise((resolve, rejects) => {
		if (canEmbed(channel as TextChannel)) {
			channel.send(Embeds.errorEmbed(content))
				.then(m => {
					if (deleteNumber) {
						setTimeout(() => {
							if (!Array.isArray(m)) m.delete().catch(() => { });
							else m.forEach(m => m.delete().catch(() => { }));
						}, deleteNumber);
					}
					resolve(m);
				})
				.catch(error => {
					rejects(error);
					channel.client.emit('error', error)
				});
		} else {
			channel.send(content)
				.then(m => {
					if (deleteNumber) {
						setTimeout(() => {
							if (!Array.isArray(m)) m.delete().catch(() => { });
							else m.forEach(m => m.delete().catch(() => { }));
						}, deleteNumber);
					}
					resolve(m);
				})
				.catch(error => {
					rejects(error);
					channel.client.emit('error', error)
				});
		}
	});
}

export function info(channel: TextChannel, content: string, deleteNumber?: number): Promise<Message | Message[]> {
	return new Promise((resolve, rejects) => {
		if (canEmbed(channel as TextChannel)) {
			channel.send(Embeds.infoEmbed(content))
				.then(m => {
					resolve(m);
					if (deleteNumber) {
						setTimeout(() => {
							if (!Array.isArray(m)) m.delete().catch(() => { });
							else m.forEach(m => m.delete().catch(() => { }));
						}, deleteNumber);
					}
				})
				.catch(error => {
					rejects(error);
					channel.client.emit('error', error)
				});
		} else {
			channel.send(content)
				.then(m => {
					resolve(m);
					if (deleteNumber) {
						setTimeout(() => {
							if (!Array.isArray(m)) m.delete().catch(() => { });
							else m.forEach(m => m.delete().catch(() => { }));
						}, deleteNumber);
					}
				})
				.catch(error => {
					rejects(error);
					channel.client.emit('error', error);
				});
		}
	})
}

export function canEmbed(channel?: TextChannel | undefined): boolean {
	if (!channel) return false;
	const me = channel.permissionsFor(channel.guild.me);
	if (!me) return false;
	return me.has('EMBED_LINKS');
}
