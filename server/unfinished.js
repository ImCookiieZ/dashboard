// app.get('/user/:id/:widget_type', async (req, res) => {
//     var user_id = req.params.id
//     var join_table
//     switch (req.params.widget_type) {
//         case "subreddit":
//             join_table = 'config_subreddit'
//             break;
//         case "feed":
//             join_table = 'config_feed'
//             break;
//         case "play":
//             join_table = 'config_play'
//             break;
//     }
//     if (typeof join_table === "undefined") {
//         res.status(400).send("non existing widgettype: " + req.params.widget_type)
//         return;
//     }
//     await db_adm_conn.query(`
//     SELECT *
//     FROM base_config
//     JOIN ` + join_table, (err, result) => {
//         if (err)
//             res.status(500).send("Error: " + err)
//         else {
//             // json_return = JSON.parse(result)
//             res.send(result.rows)
//         }
//     })
// })


// app.get('/about.json', async (req, res) => {
//     var ret
//     await db_adm_conn.query(`
//     SELECT *
//     FROM config_subreddit SU
//     JOIN base_config BA
//         ON SU.base_config_id = BA.id;`,
//         (err, result) => {
//             add_result(err, result.rows, ret)
//         }
//     )
//     json_return = JSON.parse(ret)
//     res.send(json_return.rows)
//     // res.send('Hello World! teeest' + req.query['name'])
// })


// function add_result(err, result, var_to, sender) {
//     if (err) {
//         console.log("Error on SQL request: " + err)
//     }
//     else {
//         var_to + result
//     }
// }