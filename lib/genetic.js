
var Genetic = Genetic || (function(){
	
	'use strict';
	
	// facilitates communcation between web workers
	var Serialization = {
		"stringify": function (obj) {
			return JSON.stringify(obj, function (key, value) {
				if (value instanceof Function || typeof value == "function") return "__func__:" + value.toString();
				if (value instanceof RegExp) return "__regex__:" + value;
				return value;
			});
		}, "parse": function (str) {
			return JSON.parse(str, function (key, value) {
				if (typeof value != "string") return value;
				if (value.lastIndexOf("__func__:", 0) === 0) return eval('(' + value.slice(9) + ')');
				if (value.lastIndexOf("__regex__:", 0) === 0) return eval('(' + value.slice(10) + ')');
				return value;
			});
		}
	};
	
	var Clone = function(obj) {
		if (obj == null || typeof obj != "object")
			return obj;
		
		return JSON.parse(JSON.stringify(obj));
	};
	
	var Optimize = {
		"Maximize": function (a, b) { return a >= b; }
		, "Minimize": function (a, b) { return a < b; }
	};
	
	var Select1 = {
		"Tournament2": function(pop) {
			var n = pop.length;
			var a = pop[Math.floor(Math.random()*n)];
			var b = pop[Math.floor(Math.random()*n)];
			return this.optimize(a.fitness, b.fitness) ? a.entity : b.entity;
		}, "Tournament3": function(pop) {
			var n = pop.length;
			var a = pop[Math.floor(Math.random()*n)];
			var b = pop[Math.floor(Math.random()*n)];
			var c = pop[Math.floor(Math.random()*n)];
			var best = this.optimize(a.fitness, b.fitness) ? a : b;
			best = this.optimize(best.fitness, c.fitness) ? best : c;
			return best.entity;
		}, "Fittest": function (pop) {
			return pop[0].entity;
		}, "Random": function (pop) {
			return pop[Math.floor(Math.random()*pop.length)].entity;
		}, "RandomLinearRank": function (pop) {
			this.internalGenState["rlr"] = this.internalGenState["rlr"]||0;
			return pop[Math.floor(Math.random()*Math.min(pop.length,(this.internalGenState["rlr"]++)))].entity;
		}, "Sequential": function (pop) {
			this.internalGenState["seq"] = this.internalGenState["seq"]||0;
			return pop[(this.internalGenState["seq"]++)%pop.length].entity;
		}
	};
	
	var Select2 = {
		"Tournament2": function(pop) {
			return [Select1.Tournament2.call(this, pop), Select1.Tournament2.call(this, pop)];
		}, "Tournament3": function(pop) {
			return [Select1.Tournament3.call(this, pop), Select1.Tournament3.call(this, pop)];
		}, "Random": function (pop) {
			return [Select1.Random.call(this, pop), Select1.Random.call(this, pop)];
		}, "RandomLinearRank": function (pop) {
			return [Select1.RandomLinearRank.call(this, pop), Select1.RandomLinearRank.call(this, pop)];
		}, "Sequential": function (pop) {
			return [Select1.Sequential.call(this, pop), Select1.Sequential.call(this, pop)];
		}, "FittestRandom": function (pop) {
			return [Select1.Fittest.call(this, pop), Select1.Random.call(this, pop)];
		}
	};
	
	function Genetic() {
		
		// population
		this.algorithm = null;
		this.fitness = null;
		this.seed = null;
		this.mutate = null;
		this.crossover = null;
		this.select1 = null;
		this.select2 = null;
		this.optimize = null;
		this.generation = null;
		this.notification = null;
		
		this.configuration = {
			"size": 250
			, "crossover": 0.9
			, "mutation": 0.2
			, "iterations": 100
			, "fittestAlwaysSurvives": true
			, "maxResults": 100
			, "webWorkers": true
			, "skip": 0
			, "learningRate": 0.5
			, "learningIndividuals": 5
		};
		
		this.userData = {};
		this.internalGenState = {};
		
		this.entities = [];
		this.newEntities = [];
		
		this.usingWebWorker = false;
		
		this.start = function() {
			
			var i;
			var self = this;
			
			function mutateOrNot(entity) {
				// applies mutation based on mutation probability
				return Math.random() <= self.configuration.mutation && self.mutate ? self.mutate(Clone(entity)) : entity;
			}
			
			// seed the population
			for (i=0;i<this.configuration.size;++i)  {
				this.entities.push(Clone(this.seed()));
			}

			if(this.algorithm == "pbil") {
				
				//get the chromosome length from the provided user data
				var chromosomeLength = this.userData["solution"].length

				//initialize probabilities to a starting value of 50%
				var probabilities = [];
				for(var i = 0; i < chromosomeLength; i++) {

					probabilities[i] = 0.5;
				}

				for(var x = 0; x < this.configuration.iterations; x++) {

					//initialize the population
					var pop = [];

					//create a new population
					for(var i = 0; i < this.entities.length; i++) {

						//create a new individual based on the existing probabilities
						var individual = "";
						for(var j = 0; j < chromosomeLength; j++) {

							if(probabilities[j] < Math.random()) {

								individual += "0";
							} else {

								individual += "1";
							}
						}

						//calculate the fitness of the individual and add them to the population
						pop.push({"fitness": self.fitness(individual), "entity": individual });
					}

					//sort the population
					pop.sort(function (a, b) {

						return self.optimize(a.fitness, b.fitness) ? -1 : 1;
					});

					//grab the learning rate from the configuration
					var learningRate = this.configuration.learningRate;

					//update the probability vector
					//use the top individuals to modify it
					var learningIndividuals = this.configuration.learningIndividuals;
					
					for(var j = 0; j < learningIndividuals; j++) {

						for(var i = 0; i < chromosomeLength; i++) {
							
							var currentProbability = probabilities[i];
							var learningRateModifier = (1 - learningRate);
							var individualsBit = pop[j].entity[i];

							//update this bit's probability
							probabilities[i] = currentProbability * learningRateModifier + individualsBit * (learningRate);
						}
					}

					// generation notification
					var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0)/pop.length;
					var stdev = Math.sqrt(pop
						.map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
						.reduce(function (a, b) { return a+b; }, 0)/pop.length);

					var stats = {
						"maximum": pop[0].fitness
						, "minimum": pop[pop.length-1].fitness
						, "mean": mean
						, "stdev": stdev
					};

					var r = this.generation ? this.generation(pop, x, stats) : true;

					var isFinished = (typeof r != "undefined" && !r) || (x == this.configuration.iterations-1);
					if (this.notification && (isFinished || this.configuration["skip"] == 0 || x%this.configuration["skip"] == 0)) {

						this.sendNotification(pop.slice(0, this.maxResults), x, stats, isFinished);
					}
					if (isFinished)
						break;

				}

			} else if(this.algorithm == "umda") {
				
				//get the chromosome length from the provided user data
				var chromosomeLength = this.userData["solution"].length

				//initialize probabilities to a starting value of 50%
				var probabilities = [];
				for(var i = 0; i < chromosomeLength; i++) {

					probabilities[i] = 0.5;
				}

				for(var x = 0; x < this.configuration.iterations; x++) {

					//initialize the population
					var pop = [];

					//create a new population
					for(var i = 0; i < this.entities.length; i++) {

						//create a new individual based on the existing probabilities
						var individual = "";
						for(var j = 0; j < chromosomeLength; j++) {

							if(probabilities[j] < Math.random()) {

								individual += "0";
							} else {

								individual += "1";
							}
						}

						//calculate the fitness of the individual and add them to the population
						pop.push({"fitness": self.fitness(individual), "entity": individual });
					}

					//sort the population
					pop.sort(function (a, b) {

						return self.optimize(a.fitness, b.fitness) ? -1 : 1;
					});

					//grab the learning rate from the configuration
					var learningRate = this.configuration.learningRate;

					//update the probability vector
					//use the top individuals to modify it
					var learningIndividuals = this.configuration.learningIndividuals;
					
					var distribution = [];
					for(var j = 0; j < learningIndividuals; j++) {

						for(var i = 0; i < chromosomeLength; i++) {

							//update this bit's distribution
							if(pop[j].entity[i] == "1") {
								distribution[i]++;
							}						
						}
					}

					//we now have an array that has a length of the chromosome
					//each element is the total number of 1's in the population
					//we can now deduce the probability by dividing it by the number 
					//of individuals we used to create this
					for(var i = 0; i < distribution.length; i++) {
						probabilities[i] = distribution[i] / learningIndividuals;
					}

					// generation notification
					var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0)/pop.length;
					var stdev = Math.sqrt(pop
						.map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
						.reduce(function (a, b) { return a+b; }, 0)/pop.length);

					var stats = {
						"maximum": pop[0].fitness
						, "minimum": pop[pop.length-1].fitness
						, "mean": mean
						, "stdev": stdev
					};

					var r = this.generation ? this.generation(pop, x, stats) : true;

					var isFinished = (typeof r != "undefined" && !r) || (x == this.configuration.iterations-1);
					if (this.notification && (isFinished || this.configuration["skip"] == 0 || x%this.configuration["skip"] == 0)) {

						this.sendNotification(pop.slice(0, this.maxResults), x, stats, isFinished);
					}

					if (isFinished)
						break;

				}

			} else if(this.algorithm == "cga") {
				
				//get the chromosome length from the provided user data
				var chromosomeLength = this.userData["solution"].length

				//initialize probabilities to a starting value of 50%
				var probabilities = [];
				for(var i = 0; i < chromosomeLength; i++) {

					probabilities[i] = 0.5;
				}

				for(var x = 0; x < this.configuration.iterations; x++) {

					//generate two individuals based on the existing probabilities
					var individual1 = "";
					for(var j = 0; j < chromosomeLength; j++) {

						if(probabilities[j] < Math.random()) {

							individual1 += "0";
						} else {

							individual1 += "1";
						}
					}

					//calculate the fitness of the individual
					var individual1Fitness = self.fitness(individual1)

					var individual2 = "";
					for(var j = 0; j < chromosomeLength; j++) {

						if(probabilities[j] < Math.random()) {

							individual2 += "0";
						} else {

							individual2 += "1";
						}
					}

					//calculate the fitness of the individual
					var individual2Fitness = self.fitness(individual2)

					var winner = individual1;
					var loser = individual2;
					if(individual2Fitness > individual1Fitness) {
						winner = individual2;
						loser = individual1;
					}

					for(var i = 0; i < chromosomeLength; i++) {

						if(winner[i] != loser[i]) {
							if(winner[i] == 1) {
								probabilities[i] = probabilities[i] + (1 / this.configuration.size);
							} else {
								probabilities[i] = probabilities[i] - (1 / this.configuration.size);
							}
						}
						
					}


					//not part of cGA, but temporarily building a population based on probabilities
					//updated by cGA to help the library visualize the progress. 
					//initialize the population
					var pop = [];

					//create a new population
					for(var i = 0; i < this.entities.length; i++) {

						//create a new individual based on the existing probabilities
						var individual = "";
						for(var j = 0; j < chromosomeLength; j++) {

							if(probabilities[j] < Math.random()) {

								individual += "0";
							} else {

								individual += "1";
							}
						}

						//calculate the fitness of the individual and add them to the population
						pop.push({"fitness": self.fitness(individual), "entity": individual });
					}

					//sort the population
					pop.sort(function (a, b) {

						return self.optimize(a.fitness, b.fitness) ? -1 : 1;
					});

					// generation notification
					var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0)/pop.length;
					var stdev = Math.sqrt(pop
						.map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
						.reduce(function (a, b) { return a+b; }, 0)/pop.length);

					var stats = {
						"maximum": pop[0].fitness
						, "minimum": pop[pop.length-1].fitness
						, "mean": mean
						, "stdev": stdev
					};

					var r = this.generation ? this.generation(pop, x, stats) : true;

					var isFinished = (typeof r != "undefined" && !r) || (x == this.configuration.iterations-1);
					if (this.notification && (isFinished || this.configuration["skip"] == 0 || x%this.configuration["skip"] == 0)) {

						this.sendNotification(pop.slice(0, this.maxResults), x, stats, isFinished);
					}

					if (isFinished)
						break;

				}

			} else {
			
				for (i=0;i<this.configuration.iterations;++i) {
					// reset for each generation
					this.internalGenState = {};
					
					// score and sort
					var pop = this.entities
						.map(function (entity) {
							return {"fitness": self.fitness(entity), "entity": entity };
						})
						.sort(function (a, b) {
							return self.optimize(a.fitness, b.fitness) ? -1 : 1;
						});
					
					// generation notification
					var mean = pop.reduce(function (a, b) { return a + b.fitness; }, 0)/pop.length;
					var stdev = Math.sqrt(pop
						.map(function (a) { return (a.fitness - mean) * (a.fitness - mean); })
						.reduce(function (a, b) { return a+b; }, 0)/pop.length);
						
					var stats = {
						"maximum": pop[0].fitness
						, "minimum": pop[pop.length-1].fitness
						, "mean": mean
						, "stdev": stdev
					};

					var r = this.generation ? this.generation(pop, i, stats) : true;
					var isFinished = (typeof r != "undefined" && !r) || (i == this.configuration.iterations-1);
					
					if (
						this.notification
						&& (isFinished || this.configuration["skip"] == 0 || i%this.configuration["skip"] == 0)
					) {
						this.sendNotification(pop.slice(0, this.maxResults), i, stats, isFinished);
					}
						
					if (isFinished)
						break;
					
					// crossover and mutate
					var newPop = [];
					
					if (this.configuration.fittestAlwaysSurvives) // lets the best solution fall through
						newPop.push(pop[0].entity);
					
					while (newPop.length < self.configuration.size) {
						if (
							this.crossover // if there is a crossover function
							&& Math.random() <= this.configuration.crossover // base crossover on specified probability
							&& newPop.length+1 < self.configuration.size // keeps us from going 1 over the max population size
						) {
							var parents = this.select2(pop);
							var children = this.crossover(Clone(parents[0]), Clone(parents[1])).map(mutateOrNot);
							newPop.push(children[0], children[1]);
						} else {
							newPop.push(mutateOrNot(self.select1(pop)));
						}
					}
					
					this.entities = newPop;
				}
			}
		}
		
		this.sendNotification = function(pop, generation, stats, isFinished) {
			var response = {
				"pop": pop.map(Serialization.stringify)
				, "generation": generation
				, "stats": stats
				, "isFinished": isFinished
			};
			
			
			
			if (this.usingWebWorker) {
				postMessage(response);
				//throw JSON.stringify(response)
			} else {
				// self declared outside of scope
				self.notification(response.pop.map(Serialization.parse), response.generation, response.stats, response.isFinished);
			}
			
		};
	}
	
	Genetic.prototype.evolve = function(config, userData) {
		
		var k;
		for (k in config) {
			this.configuration[k] = config[k];
		}
		
		for (k in userData) {
			this.userData[k] = userData[k];
		}
		
		// determine if we can use webworkers
		this.usingWebWorker = this.configuration.webWorkers
			&& typeof Blob != "undefined"
			&& typeof Worker != "undefined"
			&& typeof window.URL != "undefined"
			&& typeof window.URL.createObjectURL != "undefined";
		
		function addslashes(str) {
			return str.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
		}
			
		// bootstrap webworker script
		var blobScript = "'use strict'\n";
		blobScript += "var Serialization = {'stringify': " + Serialization.stringify.toString() + ", 'parse': " + Serialization.parse.toString() + "};\n";
		blobScript += "var Clone = " + Clone.toString() + ";\n";
		
		// make available in webworker
		blobScript += "var Optimize = Serialization.parse(\"" + addslashes(Serialization.stringify(Optimize)) + "\");\n";
		blobScript += "var Select1 = Serialization.parse(\"" + addslashes(Serialization.stringify(Select1)) + "\");\n";
		blobScript += "var Select2 = Serialization.parse(\"" + addslashes(Serialization.stringify(Select2)) + "\");\n";
		
		// materialize our ga instance in the worker
		blobScript += "var genetic = Serialization.parse(\"" + addslashes(Serialization.stringify(this)) + "\");\n";
		blobScript += "onmessage = function(e) { genetic.start(); }\n";
		
		var self = this;
		
		if (this.usingWebWorker) {
			// webworker
			var blob = new Blob([blobScript]);
			var worker = new Worker(window.URL.createObjectURL(blob));
			worker.onmessage = function(e) {
			  var response = e.data;
			  //throw JSON.stringify(response)
			  self.notification(response.pop.map(Serialization.parse), response.generation, response.stats, response.isFinished);
			};
			worker.onerror = function(e) {
				alert('ERROR: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
			};
			worker.postMessage("");
		} else {
			// simulate webworker
			(function(){
				var onmessage;
				eval(blobScript);
				onmessage(null);
			})();
		}
	}
	
	return {
		"create": function() {
			return new Genetic();
		}, "Select1": Select1
		, "Select2": Select2
		, "Optimize": Optimize
		, "Clone": Clone
	};
	
})();


// so we don't have to build to run in the browser
if (typeof module != "undefined") {
	module.exports = Genetic;
}
