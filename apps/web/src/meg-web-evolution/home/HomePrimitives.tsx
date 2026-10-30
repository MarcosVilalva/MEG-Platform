/**
 * MEG Home | Card e Button locais, seguindo o contrato de composição do
 * shadcn/ui (MIT): https://github.com/shadcn-ui/ui
 *
 * Adaptados intencionalmente a CSS isolado porque a aplicação não usa
 * Tailwind e a sidebar/tema global não podem ser modificados.
 * Sem dependência global e sem alterar a implementação dos botões antigos.
 */
import { forwardRef, type ComponentPropsWithoutRef } from 'react';

type CardProps=ComponentPropsWithoutRef<'section'>;
export const HomeCard=forwardRef<HTMLElement,CardProps>(function HomeCard({className='',...props},ref){
  return <section ref={ref} className={'meg-home-card '+className} {...props}/>;
});
type ButtonProps=ComponentPropsWithoutRef<'button'> & {variant?:'quiet'|'outline'|'accent'};
export const HomeButton=forwardRef<HTMLButtonElement,ButtonProps>(function HomeButton({className='',variant='outline',type='button',...props},ref){
  return <button ref={ref} type={type} className={'meg-home-button is-'+variant+' '+className} {...props}/>;
});
