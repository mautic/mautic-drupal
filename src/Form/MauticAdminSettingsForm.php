<?php

namespace Drupal\mautic\Form;

use Drupal\Core\Form\ConfigFormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\Component\Utility\UrlHelper;

/**
 * Configure Mautic settings for this site.
 */
class MauticAdminSettingsForm extends ConfigFormBase {

  /**
   * {@inheritdoc}
   */
  public function getFormId() {
    return 'mautic_admin_settings';
  }

  /**
   * {@inheritdoc}
   */
  protected function getEditableConfigNames() {
    return ['mautic.settings'];
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state) {

    $config = $this->config('mautic.settings');

    $form['general'] = [
      '#type' => 'details',
      '#title' => $this->t('General settings'),
      '#open' => TRUE,
    ];

    $form['general']['mautic_enable'] = [
      '#type' => 'checkbox',
      '#title' => t('Include Mautic Javascript Code'),
      '#default_value' => $config->get('mautic_enable'),
      '#description' => $this->t("If you want to embed the Mautic Javascript Code, enable this check."),
      '#required' => FALSE,
    ];

    $form['general']['mautic_base_url'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Mautic URL'),
      '#default_value' => $config->get('mautic_base_url'),
      '#states' => array(
        'visible' => array(
          ':input[name="mautic_enable"]' => array('checked' => TRUE),
        ),
      ),
      '#size' => 60,
      '#description' => $this->t("Your Mautic javascript code. Example: http(s)://yourmautic.com/mtc.js"),
      '#required' => TRUE,
    ];

    return parent::buildForm($form, $form_state);
  }

  /**
   * {@inheritdoc}
   */
  public function validateForm(array &$form, FormStateInterface $form_state) {

    parent::validateForm($form, $form_state);

    $url_is_valid = UrlHelper::isValid($form_state->getValue('mautic_base_url'), $absolute = TRUE);

    // Check if is a valid url.
    if (!$url_is_valid) {
      $form_state->setErrorByName('mautic_base_url', t('The URL is not valid.'));
    }
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state) {
    $config = $this->config('mautic.settings');
    $config
      ->set('mautic_enable', $form_state->getValue('mautic_enable'))
      ->set('mautic_base_url', $form_state->getValue('mautic_base_url'))
      ->save();

    parent::submitForm($form, $form_state);
  }
}