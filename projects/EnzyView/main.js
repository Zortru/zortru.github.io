// import {Reaction} from './modules/Reaction.js'


class Reaction
{
    rate(parameters)
    {
        return 0;
    }
}

class MichaelisMenten extends Reaction
{
    rate(parameters)
    {
        const vMax = parameters.vMax
        const substrate = parameters.substrate
        const km = parameters.km

        return vMax * substrate / (km + substrate)
    }
}

class parameters
{
    vMax
    substrate
    km    
}

function executa() {

	event.preventDefault();
    let param = new parameters
    param.vMax = document.querySelector('#vmax').value
    param.substrate = 1
    param.km = 1    

    const test1 = new MichaelisMenten

    document.querySelector('#resultado').value = test1.rate(param)
}
document.querySelector('#button').addEventListener('click', executa);

const labels = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
  ];

  const data = {
    labels: labels,
    datasets: [{
      label: 'My First dataset',
      backgroundColor: 'rgb(255, 99, 132)',
      borderColor: 'rgb(255, 99, 132)',
      data: [0, 10, 5, 2, 20, 30, 45],
    }]
  };

  const config = {
    type: 'line',
    data: data,
    options: {}
  };

  const myChart = new Chart(
    document.getElementById('myChart'),
    config
  );