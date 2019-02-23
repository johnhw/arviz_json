
function load_arviz(fname, callback)
{
    load_npz(fname, function(data)
    {
        console.log(data);
    })
}