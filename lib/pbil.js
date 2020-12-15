var PopulationBasedIncrementalLearning = PopulationBasedIncrementalLearning || (function(){


    function PopulationBasedIncrementalLearning() {

		this.startPopulationBasedIncrementalLearningGA = function () {

			var probabilities = [];
			var chromosomeLength = 100;

			//intialize probability vector
			for(var i = 0; i < chromosomeLength; i++) {
				probabilities[i] = 0.5;
			}

			this.startPopulationBasedIncrementalLearningGA2(probabilities);
		}

		this.startPopulationBasedIncrementalLearningGA2 = function (probabilities) {


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

				for(var i = 0; i < chromosomeLength; i++) {
					
					probabilities[i] = probabilities[i] * (1 - learningRate) + individuals[j][i] * (learningRate);
					
				}
			}

			startPopulationBasedIncrementalLearningGA2(probabilities);
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

			
			var chromosomeLength = 100;

			for(var i = 0; i < chromosomeLength; i++) {

				//fitness for onemax
				if(individual.values[i] == 1) {
					individual.fitness++;
				}
			}

		}
    }
});