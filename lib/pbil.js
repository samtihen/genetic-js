var pbil = pbil || (function(){


    function pbil() {

		this.iterations = 0;
		this.maxIterations = 500;

		this.initialize = function () {

			var probabilities = [];
			var chromosomeLength = 100;

			//intialize probability vector
			for(var i = 0; i < chromosomeLength; i++) {
				probabilities[i] = 0.5;
			}

			this.process(probabilities);
		}

		this.process = function (probabilities) {

			this.iterations++;
			var numberOfGeneratedIndividuals = 50;
			var individuals = [];

			for(var i = 0; i < numberOfGeneratedIndividuals; i++) {
				individuals[i] = this.generateIndividual(probabilities);
			}

			for(var i = 0; i < numberOfGeneratedIndividuals; i++) {
				this.evaluateIndividual(individuals[i]);
			}

			//sort the indivuduals based on fitness
			//do this

			learningRate = 0.5;

			//update the probability vector
			var nv = 25;
			for(var j = 0; j < nv; j++) {

				for(var i = 0; i < individuals[j].values.length; i++) {
					
					var currentProbability = probabilities[i];
					var learningRateModifier = (1 - learningRate);
					var individualsBit = individuals[j].values[i];

					probabilities[i] = currentProbability * learningRateModifier + individualsBit * (learningRate);
					//probabilities[i] = probabilities[i] * (1 - learningRate) + individuals[j][i] * (learningRate);
				}
			}

			if(this.iterations >= this.maxIterations){
				return;
			}

			this.process(probabilities);
		}

		this.generateIndividual = function (probabilities) {

			var individual = {};
			individual.fitness = 0;
			individual.values = [];
			var chromosomeLength = 100;

			for(var i = 0; i < chromosomeLength; i++) {

				if(probabilities[i] < Math.random()) {
					individual.values[i] = 0;
				} else {
					individual.values[i] = 1;
				}
			}

			return individual;

		}

		this.evaluateIndividual = function (individual) {
			
			for(var i = 0; i < individual.values.length; i++) {

				//fitness for onemax
				if(individual.values[i] == 1) {
					individual.fitness++;
				}
			}
		}
	}
	
	return {
		"create": function() {
			return new pbil();
		}
	};
})();



// so we don't have to build to run in the browser
if (typeof module != "undefined") {
	module.exports = pbil;
}
