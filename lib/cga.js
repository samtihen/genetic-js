var cga = cga || (function(){


    function cga() {

		
		this.startCompactGA = function () {

			var probabilities = [];
			var chromosomeLength = 100;

			//intialize probability vector
			for(var i = 0; i < chromosomeLength; i++) {
				probabilities[i] = 0.5;
			}

			this.startCompactGA2(probabilities);
		}

		this.startCompactGA2 = function (probabilities) {

			var a = generateIndividual(probabilities);
			var b = generateIndividual(probabilities);

			var winner = compete(a, b);
			var loser = compete(a, b);

			var chromosomeLength = 100;
			for(var i = 0; i < chromosomeLength; i++) {

				if(winner != loser){
					if(winner == 1) {
						probabilities[i] = probabilities[i] + (1 / populationSize);
					} else {
						probabilities[i] = probabilities[i] - (1 / populationSize);
					}
				}
				
			}
			for(var i = 0; i < chromosomeLength; i++) {
				if(probabilities[i] > 0 && probabilities[i] < 1) {
					//keep going
				}
			}
			
		}
    }
});