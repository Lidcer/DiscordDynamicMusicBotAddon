
const Embeds = require('../dist/embeds');

describe('Test Youtube', () => {

    it('should generate proper slider', () => {
        expect(Embeds.sliderGenerator(5, 100)).toBe('▬🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
        expect(Embeds.sliderGenerator(105, 100)).toBe('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
        expect(Embeds.sliderGenerator(50.55555, 100)).toBe('▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬🔘▬▬▬▬▬▬▬▬▬▬▬▬▬▬');
    })



    /*
        const msg = '`tset` *test* **tset** __set__ ```testse``` __ asd asda asd ** asdasd'
    
        it(('Should do something'), () => {
    
    
            const result = Embeds.arrayReplace(msg, '**')
            console.log(result)
        });
    
        it('Should remove discord markup', () => {
            expect(Embeds.discordEscapedCharacters('`this` * this ** test')).toBe('\\`this\\` ` this `` test');
            expect(Embeds.discordEscapedCharacters('**this** * this ** test')).toBe('\\*\\*this\\*\\* * this ** test');
            expect(Embeds.discordEscapedCharacters('*this* * this ** test')).toBe('\\*this\\* * this ** test');
            expect(Embeds.discordEscapedCharacters('```this``` * this ** test')).toBe('\\\\`\\``this\\`\\`\\` ``` this `````` test');
            expect(Embeds.discordEscapedCharacters('__this__ _ this __ test')).toBe('\\_\\_this\\_\\_ _ this __ test');
        });
        */
});