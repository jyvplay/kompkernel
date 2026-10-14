# Method `render_template` does not use blueprint specified `template_folder`

**@Kevin922** opened on 2015-03-03T03:06:26Z

1. File structure:

```
project -
      - templates \
                - a \
                      search.html
                - b \
                      search.html
      - start.py
      - myapplication \
                - test.py 
```
1. Start file:

```
# start.py
from flask import Flask
from myapplication.test import test_blueprint

app = Flask(__name__)
app.register_blueprint(test_blueprint)
```
1. my application

```
# test.py
from flask import Blueprint, render_template, abort
from jinja2 import TemplateNotFound

test_blueprint = Blueprint('test_blueprint', __name__,
                        template_folder='absolute_path_to_project/templates/a')  
                        # YES, I specified the absolute path to the template a

@test_blueprint.route('/test')
def show():
    try:
        return render_template(''search.html") # HERE is the problem
    except TemplateNotFound:
        abort(404)
```

Is this a problem? 
        # Actually, I want to render **a/search.html**
        # But, `render_template()` does not use **test_blueprint's template_folder**
        # `render_template()` search the **template list**, find the first **search.html**, then render
        # So, maybe render **a/search.html** or **b/search.html**
        # This depend on the sequence of the **template list**



---
**@untitaker** commented on 2015-03-29T11:58:51Z

What is the output, and what did you expect?


---
**@alanhamlett** commented on 2015-06-23T17:33:48Z

The [render_template](https://github.com/mitsuhiko/flask/blob/5e12748d0efb5fc3d1f6a68d7bf05fd8980a2fd4/flask/templating.py#L112) function should look like this:

``` python
def render_template(template_name_or_list, **context):
    """Renders a template from the template folder with the given
    context.
    :param template_name_or_list: the name of the template to be
                                  rendered, or an iterable with template names
                                  the first one existing will be rendered
    :param context: the variables that should be available in the
                    context of the template.
    """
    ctx = _app_ctx_stack.top
    ctx.app.update_template_context(context)

    template = None

    if (request.blueprint is not None and
        isinstance(template_name_or_list, string_types)):
        blueprint_template_folder = current_app.blueprints[request.blueprint]
        if blueprint_template_folder is not None:
            template = ctx.app.jinja_env.get_or_select_template(
                os.path.join(blueprint_template_folder, template_name_or_list))

    if template is None:
        template = ctx.app.jinja_env.get_or_select_template(template_name_or_list)

    return _render(template, context, ctx.app)
```

Alternatively we could modify the Jinja2 context so [get_or_select_template](https://github.com/mitsuhiko/jinja2/blob/f22fdd5ffe81aab743f78290071b0aa506705533/jinja2/environment.py#L842) looks in the blueprint's template folder first.


---
**@ael-code** commented on 2015-07-08T09:02:23Z

I encountered the same bug. This is a **huge bug** that could brake a lot of blueprints.

I build up a simple example to reproduce the bug.  You can look at the comments inside code for more details.
https://github.com/ael-code/flask_bugs


---
**@dagostinelli** commented on 2015-07-12T18:17:08Z

I suspect that I'm running into this as well.  Is this just the way it works?

Maybe it would help matters if the stock [Blueprint example](https://github.com/mitsuhiko/flask/tree/master/examples/blueprintexample) was updated to show the intended way to run multiple blueprints.  The existing example doesn't seem to address what we are asking about in this issue.  I think it could be updated to show two different Blueprints, running side by side, with their own copy of /templates.  They both should have an index.html showing how to load one or the other from the Blueprint's-specified templates folder.  That way, we will understand clearly what is the intended way to do this. 

I'd do it myself, except I don't know if what I'm writing below is the intended way or if there actually is a bug here.  

It feels like:
- `flask.render_template` ought to be searching the blueprint's `template_folder` first and then fall back to `app.template_folder` (and deal with the subsequent problem of caching internally)
- or maybe the Blueprint class should have a render_template works like that (search the blueprint's `template_folder` first and then fall back to `app.template_folder`.

For my project, I am currently doing things as follows.  This is working, but it's messy because everything in mixed together in the `/templates` folder.

```
/myapp
  /blueprint1
    views.py
  /blueprint2
    views.py
  /templates
    /blueprint1
      index.html
    /blueprint2
      index.html
```

_blueprint1/views.py_

```
bp = Blueprint('blueprint1', __name__, static_folder='static', template_folder='templates")
@bp.route("/")
def index():
    return flask.render_template('blueprint1/index.html')
```

_blueprint2/views.py_

```
bp = Blueprint('blueprint2', __name__, static_folder='static', template_folder='templates")
@bp.route("/")
def index():
    return flask.render_template('blueprint2/index.html')
```

See how we have to specify the name of the blueprint path in render_template?  

I was hoping for this to work instead:

_blueprint1/views.py_

```
bp = Blueprint('blueprint1', __name__, static_folder='static', template_folder='blueprint1/templates")
@bp.route("/")
def index():
    return flask.render_template('index.html')
```

_blueprint2/views.py_

```
bp = Blueprint('blueprint2', __name__, static_folder='static', template_folder='blueprint2/templates")
@bp.route("/")
def index():
    return flask.render_template('index.html')
```

An improvement is to add a render_template() function to the Blueprint object that is guaranteed to search the template_folder first and fall back to `app.template_folder` if it doesn't exist.

```
bp = Blueprint('blueprint2', __name__, static_folder='static', template_folder='blueprint2/templates")
@bp.route("/")
def index():
    return bp.render_template('index.html')
```

**If I had a vote, I'd vote for this last idea** because I think it's the most clear.


---
**@JelteF** commented on 2015-07-15T20:30:59Z

I was running into the same problem, I have changed the code supplied by @alanhamlett to work with the way paths were supposed to be supplied to blueprints.

``` python
def render_template(template_name_or_list, **context):
    """
    Renders a template from the template folder with the given
    context.
    :param template_name_or_list: the name of the template to be
                                  rendered, or an iterable with template names
                                  the first one existing will be rendered
    :param context: the variables that should be available in the
                    context of the template.
    """
    ctx = _app_ctx_stack.top
    ctx.app.update_template_context(context)

    template = None

    if request.blueprint is not None and \
            isinstance(template_name_or_list, string_types):
        bp = current_app.blueprints[request.blueprint]
        try:
            template = bp.jinja_loader.load(ctx.app.jinja_env,
                                            template_name_or_list,
                                            ctx.app.jinja_env.globals)
        except TemplateNotFound:
            pass

    if template is None:
        template = ctx.app.jinja_env\
            .get_or_select_template(template_name_or_list)

    return _render(template, context, ctx.app)
```

I think it is really weird and unwanted behaviour that one blueprint searches in another blueprint's template_folder. This still does not fix that, but it at least searches is own folder first, then the app folder and then all the other blueprints their folders.


---
**@davidism** commented on 2015-07-15T21:03:07Z

The point of searching the app template folder first is so that an app developer can override templates supplied by a blueprint from an extension.  Is this still possible with these changes?


---
**@JelteF** commented on 2015-07-15T21:19:04Z

No, this method first searches the blueprint template folder. Overriding of the blueprint templates would require some changes that I'm not sure how to do. The reason for this is that currently all the blueprint template folders are added to the global app search path. This means that loading from the app will try to load from any blueprint as well, which means another blueprint folder can be searched before the blueprint of the route that is actually used.

The above code fixes this by first searching the blueprint template folder and only after nothing is found it will search all other options. To fix this something would need to change in the app loader, which requires more work. Since I do not need overriding of templates I did not implement this. Feel free to change the code though.


---
**@mattupstate** commented on 2015-08-04T13:39:52Z

Preferring the blueprint template folder over the application's template folder would break the existing contract between app's and blueprints. This contract is used to much success across the extension ecosystem. For example, the Flask-Security extension mounts a blueprint to an application and comes packaged with a set of minimal default templates. The app developer can then override the stock templates by placing their own files in the app's template folder under the same path as the extension's blueprint.

