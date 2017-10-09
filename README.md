Mautic Drupal 7.x module
========================

This Drupal 7 module lets you add the Mautic tracking gif image to your Drupal website and embed Mautic forms in Drupal content.

### Installation

1. [Download](https://github.com/mautic/mautic-drupal/archive/7.x.zip) zip package.
2. In your Drupal; go to **Modules** / **Install new module**.
3. Upload the zip package you've downloaded in the step 1.
4. Enable Mautic module.
5. Configure Mautic module - insert Mautic Base URL and pages where tracking should be enabled. Save Confuguration.

### Form embed

To embed a Mautic form into Drupal content, insert this code snippet:

`[mauticform id=ID]`

ID is the identifier of the Mautic form you want to embed. You can see the ID of the form in the URL of the form detail. For example for www.yourmautic.com/forms/view/1, ID = 1.

To add dynamic web content, insert this shortcode:

`[mautic type="content" slot="slot_name"] <your default content> [/mautic]`

where `slot_name` is the dynamic content slot token name you gave in the campaign.

To add Focus Item, insert this shortcode

`[mauticfocusitem id=ID]`

ID is the identifier of the Focus item you want to embed.

To control Focus Item visibility, use Blocks to render your Focus item on specific paths.

### Prefill Mautic forms

You can prefill an embedded Mautic form in Drupal page by passing form keys as Hash params in the URL.
e.g. /your-form-url#p:email=email@somedomain.com&firstname=John&lastname=Doe
