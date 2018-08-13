const readline = require('readline');
const fs = require('fs');
const http = require('http');

const filePath = 'config/urls.csv';

const rl = readline.createInterface({
  input: fs.createReadStream(filePath, {
    encoding: 'utf8'
  }),
  crlfDelay: Infinity
});

rl.on('line', (line) => {
  const columns = line.split(',');
  let url = columns[0];
  let name = columns[1];

  let sound = fs.createWriteStream(`sound/${name}.m4a`);
  http.get(url, function (response) {
    response.pipe(sound);
  });
});