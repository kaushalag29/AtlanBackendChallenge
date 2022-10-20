const express = require('express');
const bodyParser = require('body-parser');
const nocache = require('nocache');
const fastcsv = require('fast-csv');
const fs = require('fs');
const app = express();
const PORT = 4000
var db = undefined


app.use(express.static(__dirname));
app.use(express.static(__dirname+'/js'));

app.use(bodyParser.urlencoded({extended: false}));

app.use(nocache());

const mongoConnect = require('./js/database').mongoConnect;

app.set('views','html');

app.get('/',(req,res,next) => {
    res.send("<h1>Welcome</h1>");
});

app.get('/question/:id',(req,res,next) => {
    question_id = req.params.id;
    if(["1", "2"].includes(question_id)) {
        get_specific_question(question_id).then(function(question_item){
            res.send(question_item);
        });
    } else {
        res.status(400).send("<h1>Invalid QuestionId</h1>");
    }
});

app.get('/answer/:id',(req,res,next) => {
    answer_id = req.params.id;
    if(["1", "2", "3", "4"].includes(answer_id)) {
        get_specific_answer(answer_id).then(function(answer_item){
            res.send(answer_item);
        });
    } else {
        res.status(400).send("<h1>Invalid AnswerId</h1>");
    }
});

app.get('/answers/question/:id',(req,res,next) => {
    var data = [];
    question_id = req.params.id;
    if(["1", "2"].includes(question_id)) {
        out_file_name = `data${question_id}.csv`;
        get_specific_question(question_id).then(function(question_item){
            console.log(question_item);
            data = data.concat(question_item["Questions"]);
            console.log(data);
            get_answers(question_item["QuestionId"]).then(function(answers){
                console.log(answers);
                for(let i=0; i<answers.length; i++) {
                    data = data.concat(answers[i]["Answers"]);
                }
                console.log(data);
                try {
                    var file = fs.createWriteStream(`public/${out_file_name}`);
                    fastcsv
                          .write(data, { headers: false })
                          .on("finish", function() {
                               res.send(`<a href='/public/${out_file_name}' download=${out_file_name} id='download-link'></a><script>document.getElementById('download-link').click();</script>`);
                          })
                          .pipe(file);
                } catch(err) {
                    console.log(err.message);
                }
            });
        });
    } else {
        res.status(400).send("<h1>Invalid QuestionId</h1>");
    }
});

app.use((req, res, next) => {
    res.status(404).redirect('/');
});

async function get_specific_question(question_id) {
    let question = await db.collection("questions").findOne({"QuestionId": question_id}, {projection: {"_id": 0}});
    return question;
}
async function get_specific_answer(answer_id) {
    let answer = await db.collection("answers").findOne({"AnswerId": answer_id}, {projection: {"_id": 0}});
    return answer;
}
async function get_answers(question_id) {
    let answers = await db.collection("answers").find({"QuestionId": question_id}, {projection: {"_id": 0}}).toArray();
    return answers;
}

mongoConnect(() => {
    const getDb = require('./js/database').getDb;
    db = getDb();
    var server;
    try{
        server = app.listen(PORT);
    }catch(err){
        console.log(err);
    }
});
