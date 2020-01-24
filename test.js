// @ts-check


const Discord = require('discord.js');

const client = new Discord.Client()


client.on('ready', () => {
    console.log(client.users.filter(u => u.username.toLowerCase().includes('ryt')).map(u => `${u.tag} ${u.id}`))

})








client.login('NTYwMjI5NDMwMTU3Mzc3NTU2.XiIwtw.iT_ZokxsuWMAZg8iIePkGQRRNRo')