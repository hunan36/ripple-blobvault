var response = require('response')
var resend_email = function() {
    var hash = {}
    var check = function(req,res,next) {
        var datestr = new Date().toDateString();
        if (req.body.email) {
            if (hash[req.body.email] === undefined) {
                hash[req.body.email] = {date:datestr,count:0}
            }
            if (hash[req.body.email].date != datestr) {
                hash[req.body.email].count = 0;
                hash[req.body.email].date = datestr;
            }
            hash[req.body.email].count++;
            if (hash[req.body.email].count > 5) {
                response.json({result:'error', message:'resend limit reached'}).status(403).pipe(res)
            } else
                next()
        } else {
            response.json({result:'error', message:'missing email in body'}).status(400).pipe(res)
        }
    }
    return {check : check}
}
module.exports = function(store) {
    var locked_check = function(address,cb) {
        store.checkLocked(address,function(resp) {
            if (resp.length) {
                var row = resp[0];
                var isLocked = ((row.locked !== '') && (row.isFunded === false))
                var reason = (isLocked) ? row.locked : undefined
                cb(isLocked,reason)
            } else {
                cb(false)
            }
        })
    }
    var locked = function(req,res,next) {
        var address = req.query.address
        if (address === undefined) {
            var id = req.query.signature_blob_id || req.body.blob_id;
            if (id) {
                store.db('blob')
                .where('id','=',id)
                .select('address')
                .then(function(resp) {
                    console.log(resp)
                    var address = resp[0].address;
                    locked_check(address,function(isLocked,reason) {
                        if (isLocked === true) 
                            response.json({result:'locked', message:reason}).status(403).pipe(res)
                        else 
                            next()
                    })
                })
            }
        } else {
            locked_check(address,function(isLocked,reason) {
                if (isLocked === true) 
                    response.json({result:'locked', message:reason}).status(403).pipe(res)
                else 
                    next()
            })
        }
    }
    return {
        resend_email: resend_email,
        locked_check: locked_check, // exposed for testing
        locked:locked
    }
