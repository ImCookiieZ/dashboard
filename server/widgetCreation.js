// async function error_hander_widget_creation(res, db_adm_conn, args, token) {
//     if (Helper.test_undefined(args) === false) {
//         res.status(400).send("Error: Bad request")
//         return false
//     }

//     var values = await Helper.check_token(token, db_adm_conn)
//     if (values.ret_value === false) {
//         res.status(500).send("Error: " + values.line_value)
//         return false
//     } else if (values.line_value.rows[0].user_id != user_id) {
//         console.log(values.line_value)
//         res.status(403).send("Error: access_token not valid for user_id. FORBIDDEN!")
//         return false
//     }
//     return true
// }

// async function create_subreddit(req, res, db_adm_conn) {
//     var subreddit = req.body['subreddit']
//     var sort = req.body['sort']
//     var timer = req.body['timer']
//     var user_id = req.body['user_id']
//     var token = req.headers['access_token']
//     if (error_hander_widget_creation(res, db_adm_conn, [token, subreddit, sort, timer, user_id], token) === false)
//         return

//     var base = await Helper.create_base_config(user_id, "reddit", timer, db_adm_conn)
//     var sort_id = await Helper.get_sort_id(sort, db_adm_conn)
//     if (base.ret_value === false || sort_id.ret_value === false) {
//         if (base.ret_value === false)
//             console.log(base.line_value)
//         if (sort_id.ret_value === false)
//             console.log(sort_id.line_value)
//         res.status(500).send("Internal Server Error")
//         return
//     }

//     let base_id = base.line_value.rows[0].id
//     try {
//         var sub_id = await db_adm_conn.query(`
//     INSERT INTO config_subreddit
//     (subreddit, sort_id, base_config_id)
//     VALUES
//     ('` + Helper.escape(subreddit) + `', `
//             + Helper.escape(sort_id.line_value.rows[0].id)
//             + ", " + Helper.escape(base_id) + `) RETURNING id;`)
//         res.send({ config_id: sub_id.rows[0].id })
//     }
//     catch (err) {
//         res.status(500).send("Internal Server Error:" + err.stack)
//     }
// }

// module.exports = { create_subreddit }