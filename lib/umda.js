var umda = umda || (function(){

    function umda() {


		this.startUMDAGA = function () {

			var probabilities = [];
			var chromosomeLength = 100;

			//intialize probability vector
			for(var i = 0; i < chromosomeLength; i++) {
				probabilities[i] = 0.5;
			}

			this.startUMDAGA2(probabilities);
		}

		this.startUMDAGA2 = function (probabilities) {

			//generate M new individuals
			var numberOfGeneratedIndividuals = 50;
			var individuals = [];

			for(var i = 0; i < numberOfGeneratedIndividuals; i++) {
				individuals[i] = this.generateIndividualUMDA(probabilities);
			}

			//evaluate all individuals
			for(var i = 0; i < numberOfGeneratedIndividuals; i++) {
				this.evaluateIndividualUMDA(individuals[i]);
			}

			var bestIndividuals = [];
			var bestCount = 10;

			//select best N
			for(var i = 0; i < numberOfGeneratedIndividuals; i++) {

				if(bestIndividuals.length < bestCount){
					//if we dont have enough yet, take anything
					bestIndividuals.push(individuals[i]);
				} else {
					//if we already have our best count, take only those that are better
					if(individuals[i].fitness > Math.min(...bestIndividuals)){
						bestIndividuals.push(individuals[i]);
					}
				}
			}

			//Now that we have a subset of our best, calculate probability from selected individuals
			//this is an array that will have the all the bits probabilities
			distribution = [];

			//look bit by bit
			//look through our best individuals
			for(var i = 0; i < bestIndividuals.length; i++) {
				for(var j = 0; j < bestIndividuals[i].values.length; i++) {
					bestIndividuals[i].values[k];

					if(bestIndividuals[i].values[k] == 1){
					    distribution[j]++;
					}
				}
			}

			//we now have an array that has a length of the chromosome
			//each element is the total number of 1's in the population
			//we can now deduce the probability by dividing it by the number 
			//of individuals we used to create this
			for(var i = 0; i < distribution.length; i++) {
				distribution[i] = distribution[i] / bestCount;
			}

			//we can now generate new individuals using this new probability array
			//Replace parent with M new individuals generated according to the distribution

			this.startUMDAGA2(probabilities);
		}

		this.generateIndividualUMDA = function (probabilities) {

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

		this.evaluateIndividualUMDA = function (individual) {

			
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